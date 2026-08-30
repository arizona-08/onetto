import { BadGatewayException, BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PdfService } from 'src/pdf/pdf.service';
import { PrismaService } from 'src/prisma/prisma.service';
import type { User } from 'src/types/extended-request.types';

@Injectable()
export class FacturXService {
  constructor(private readonly prisma: PrismaService, private readonly pdf: PdfService) {}

  async generate(documentId: string, user: User): Promise<Buffer> {
    const document = await this.prisma.document.findFirst({
      where: { id: documentId, type: 'INVOICE', company: { OR: [{ ownerId: user.id }, { companyUsers: { some: { userId: user.id } } }] } },
      include: { company: true, services: true },
    });
    if (!document) throw new NotFoundException('Facture introuvable ou accès non autorisé.');
    if (!document.documentNumber) throw new BadRequestException('La facture doit avoir un numéro.');
    const enInvoice = this.toEn16931(document);
    const pdf = await this.pdf.generate({ ...document, company: document.company });
    const form = new FormData();
    form.append('invoice', new Blob([JSON.stringify(enInvoice)], { type: 'application/json' }), 'invoice.json');
    const pdfBytes = pdf.buffer.slice(pdf.byteOffset, pdf.byteOffset + pdf.byteLength) as ArrayBuffer;
    form.append('pdf', new Blob([pdfBytes], { type: 'application/pdf' }), `facture-${document.documentNumber}.pdf`);
    let response: Response;
    try {
      response = await fetch('https://api.superpdp.tech/v1.beta/invoices/convert?from=en16931&to=factur-x', { method: 'POST', body: form });
    } catch { throw new BadGatewayException('Le convertisseur Factur-X SuperPDP est indisponible.'); }
    if (!response.ok) {
      const details = (await response.text()).slice(0, 1500);
      throw new BadGatewayException(
        details
          ? `SuperPDP a refusé les données Factur-X (${response.status}) : ${details}`
          : `SuperPDP a refusé les données Factur-X (HTTP ${response.status}).`,
      );
    }
    return Buffer.from(await response.arrayBuffer());
  }

  async archive(documentId: string, user: User): Promise<Buffer> {
    const file = await this.generate(documentId, user);
    await this.prisma.document.update({ where: { id: documentId }, data: { facturXContent: Uint8Array.from(file), facturXGeneratedAt: new Date() } });
    return file;
  }

  private toEn16931(document: any) {
    const money = (value: number) => Number(value).toFixed(2);
    const vat = new Map<number, { taxable: number; tax: number }>();
    const lines = document.services.map((line: any, index: number) => {
      const rate = Number(line.taxRate ?? 0); const net = Number(line.unitPrice) * Number(line.quantity);
      const group = vat.get(rate) ?? { taxable: 0, tax: 0 }; group.taxable += net; group.tax += net * rate / 100; vat.set(rate, group);
      return { identifier: String(index + 1), invoiced_quantity: String(line.quantity), invoiced_quantity_code: 'C62', net_amount: money(net), price_details: { item_net_price: money(line.unitPrice), item_price_base_quantity: '1', quantity_unit_code: 'C62' }, item_information: { name: line.description }, vat_information: { invoiced_item_vat_category_code: rate ? 'S' : 'Z', invoiced_item_vat_rate: money(rate) } };
    });
    const totalVat = Number(document.totalPrice) - Number(document.totalPriceExcludingTax);
    const address = (party: any) => ({ address_line1: party.address, city: party.city, post_code: party.postalCode, country_code: party.country === 'France' ? 'FR' : party.country });
    const electronicScheme = document.company.electronicAddressScheme === 'SIREN' || document.company.electronicAddressScheme === 'SIRET' ? '0002' : document.company.electronicAddressScheme;
    return {
      number: document.documentNumber, issue_date: document.sentAt?.toISOString().slice(0, 10) ?? document.createdAt.toISOString().slice(0, 10), type_code: 380, currency_code: document.currencyCode ?? 'EUR',
      process_control: { specification_identifier: 'urn:cen.eu:en16931:2017' },
      seller: { name: document.company.name, electronic_address: { value: document.company.electronicAddress, scheme: electronicScheme }, postal_address: address(document.company), legal_registration_identifier: { value: document.company.siren, scheme: '0002' }, ...(document.company.subjectToVat && document.company.vatNumber ? { vat_identifier: document.company.vatNumber } : {}) },
      buyer: { name: document.clientName, postal_address: address({ address: document.clientAddress, city: document.clientCity, postalCode: document.clientPostalCode, country: document.clientCountry }) },
      totals: { sum_invoice_lines_amount: money(document.totalPriceExcludingTax), total_without_vat: money(document.totalPriceExcludingTax), total_with_vat: money(document.totalPrice), amount_due_for_payment: money(document.totalPrice), total_vat_amount: { value: money(totalVat), currency_code: document.currencyCode ?? 'EUR' } },
      vat_break_down: [...vat.entries()].map(([rate, item]) => ({ vat_category_code: rate ? 'S' : 'Z', vat_category_rate: money(rate), vat_category_taxable_amount: money(item.taxable), vat_category_tax_amount: money(item.tax) })), lines,
      payment_due_date: document.paymentDueAt.toISOString().slice(0, 10), payment_terms: 'Paiement à échéance.',
    };
  }
}
