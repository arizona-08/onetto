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
    if (document.facturXContent) return Buffer.from(document.facturXContent);
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

  /**
   * The Factur-X archive uses the French CIUS. Peppol endpoints commonly
   * expect the Peppol BIS Billing 3.0 profile instead, so produce UBL from
   * the same invoice data with Peppol's BT-23/BT-24 profile identifiers.
   */
  async generatePeppolUbl(documentId: string, user: User): Promise<Buffer> {
    const document = await this.prisma.document.findFirst({
      where: { id: documentId, type: 'INVOICE', company: { OR: [{ ownerId: user.id }, { companyUsers: { some: { userId: user.id } } }] } },
      include: { company: true, services: true },
    });
    if (!document) throw new NotFoundException('Facture introuvable ou accès non autorisé.');
    if (!document.documentNumber) throw new BadRequestException('La facture doit avoir un numéro.');
    let response: Response;
    try {
      response = await fetch('https://api.superpdp.tech/v1.beta/invoices/convert?from=en16931&to=ubl', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/xml' },
        body: JSON.stringify(this.toEn16931(document, 'peppol')),
      });
    } catch {
      throw new BadGatewayException('Le convertisseur UBL Peppol SuperPDP est indisponible.');
    }
    if (!response.ok) {
      const details = (await response.text()).slice(0, 1500);
      throw new BadGatewayException(
        details
          ? `SuperPDP ne peut pas générer l’UBL Peppol (${response.status}) : ${details}`
          : `SuperPDP ne peut pas générer l’UBL Peppol (HTTP ${response.status}).`,
      );
    }
    const ubl = Buffer.from(await response.arrayBuffer());
    if (!ubl.length) {
      throw new BadGatewayException(`SuperPDP a retourné un UBL vide pour la facture ${document.documentNumber}.`);
    }
    return ubl;
  }

  /**
   * Used only before SuperPDP has accepted an outgoing invoice. This lets us
   * repair a technical archive after a failed pre-submission validation while
   * still keeping the archive immutable once a provider invoice exists.
   */
  async regenerateForFailedB2BTransmission(documentId: string, user: User): Promise<Buffer> {
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
    try { response = await fetch('https://api.superpdp.tech/v1.beta/invoices/convert?from=en16931&to=factur-x', { method: 'POST', body: form }); }
    catch { throw new BadGatewayException('Le convertisseur Factur-X SuperPDP est indisponible.'); }
    if (!response.ok) throw new BadGatewayException(`SuperPDP a refusé les données Factur-X (${response.status}) : ${(await response.text()).slice(0, 1500)}`);
    const file = Buffer.from(await response.arrayBuffer());
    await this.prisma.document.update({ where: { id: documentId }, data: { facturXContent: Uint8Array.from(file), facturXGeneratedAt: new Date() } });
    return file;
  }

  private toEn16931(document: any, profile: 'factur-x' | 'peppol' = 'factur-x') {
    const money = (value: number) => Number(value).toFixed(2);
    // `#` is useful in the Onetto display number but is forbidden by the
    // French Factur-X identifier rules used by SuperPDP.
    const compliantInvoiceNumber = String(document.documentNumber).replace(/[^A-Za-z0-9+\-./]/gu, '');
    const paymentDueDate = document.paymentDueAt.toISOString().slice(0, 10);
    const issueDate = document.sentAt?.toISOString().slice(0, 10) ?? document.createdAt.toISOString().slice(0, 10);
    const deliveryAddress = {
      address: document.deliveryAddress || document.clientAddress,
      city: document.deliveryCity || document.clientCity,
      postalCode: document.deliveryPostalCode || document.clientPostalCode,
      country: document.deliveryCountry || document.clientCountry,
    };
    const vat = new Map<number, { taxable: number; tax: number }>();
    const lines = document.services.map((line: any, index: number) => {
      const rate = Number(line.taxRate ?? 0); const net = Number(line.unitPrice) * Number(line.quantity);
      const group = vat.get(rate) ?? { taxable: 0, tax: 0 }; group.taxable += net; group.tax += net * rate / 100; vat.set(rate, group);
      return { identifier: String(index + 1), invoiced_quantity: String(line.quantity), invoiced_quantity_code: 'C62', net_amount: money(net), price_details: { item_net_price: money(line.unitPrice), item_price_base_quantity: '1', quantity_unit_code: 'C62' }, item_information: { name: line.description }, vat_information: { invoiced_item_vat_category_code: rate ? 'S' : 'Z', invoiced_item_vat_rate: money(rate) } };
    });
    const totalVat = Number(document.totalPrice) - Number(document.totalPriceExcludingTax);
    const address = (party: any) => ({ address_line1: party.address, city: party.city, post_code: party.postalCode, country_code: party.country === 'France' ? 'FR' : party.country });
    const electronicScheme = document.company.electronicAddressScheme === 'SIREN'
      ? '0002'
      : document.company.electronicAddressScheme === 'SIRET'
        ? '0009'
        : document.company.electronicAddressScheme;
    // `0225` is the Peppol participant scheme used to discover a receiving
    // endpoint. The buyer electronic address (BT-49) is the delivery address:
    // it must therefore keep the selected Peppol endpoint. The SIREN is a
    // distinct legal-registration identifier (BT-47), encoded with `0002`.
    const inferredBuyerSiren = document.clientSiren
      ?? document.clientElectronicAddress?.match(/^(\d{9})_/u)?.[1];
    const peppolRoutingIdentifier = document.clientElectronicAddress
      ? document.clientElectronicAddressScheme === '0225'
        ? { value: document.clientElectronicAddress, scheme: '0225' }
        : /^(\d{9})_/u.test(document.clientElectronicAddress)
          ? { value: document.clientElectronicAddress, scheme: '0225' }
          : undefined
      : undefined;
    const buyerElectronicAddress = document.clientType === 'BUSINESS' && peppolRoutingIdentifier
      ? peppolRoutingIdentifier
      : document.clientElectronicAddress && document.clientElectronicAddressScheme
        ? { value: document.clientElectronicAddress, scheme: document.clientElectronicAddressScheme }
        : undefined;
    console.log('[Factur-X] B2B addressing data', {
      documentId: document.id,
      operationNature: document.operationNature,
      businessProcessType: this.getBusinessProcessType(document.operationNature),
      sellerElectronicAddress: document.company.electronicAddress,
      sellerElectronicAddressScheme: electronicScheme,
      buyerElectronicAddress,
      buyerSiren: inferredBuyerSiren,
      peppolRoutingIdentifier,
    });
    return {
      number: compliantInvoiceNumber, issue_date: issueDate, type_code: 380, currency_code: document.currencyCode ?? 'EUR',
      // Peppol requires a buyer-side routing reference (BT-10) or a buyer
      // purchase order (BT-13). Onetto has no dedicated BT-10 field yet, so
      // use a stable technical reference for the transport document.
      ...(profile === 'peppol' ? { buyer_reference: `ONETTO-${compliantInvoiceNumber}` } : {}),
      process_control: {
        specification_identifier: profile === 'peppol'
          ? 'urn:cen.eu:en16931:2017#compliant#urn:fdc:peppol.eu:2017:poacc:billing:3.0'
          : 'urn:cen.eu:en16931:2017',
        business_process_type: profile === 'peppol'
          ? 'urn:fdc:peppol.eu:2017:poacc:billing:01:1.0'
          : this.getBusinessProcessType(document.operationNature),
      },
      seller: { name: document.company.name, electronic_address: { value: document.company.electronicAddress, scheme: electronicScheme }, postal_address: address(document.company), legal_registration_identifier: { value: document.company.siren, scheme: '0002' }, ...(document.company.subjectToVat && document.company.vatNumber ? { vat_identifier: document.company.vatNumber } : {}) },
      buyer: {
        name: document.clientName,
        postal_address: address({ address: document.clientAddress, city: document.clientCity, postalCode: document.clientPostalCode, country: document.clientCountry }),
        ...(document.clientType === 'BUSINESS' && buyerElectronicAddress
          ? { electronic_address: buyerElectronicAddress }
          : {}),
        ...(document.clientType === 'BUSINESS' && inferredBuyerSiren
          ? {
              legal_registration_identifier: { value: inferredBuyerSiren, scheme: '0002' },
            }
          : {}),
        ...(document.clientType === 'BUSINESS' && document.clientVatNumber ? { vat_identifier: document.clientVatNumber } : {}),
      },
      // A delivery group must not be emitted empty. When no separate place is
      // provided, the buyer's invoicing address is the delivery location and
      // the invoice issue date is the default supply date.
      delivery_information: { deliver_to_name: document.clientName, delivery_date: issueDate },
      deliver_to_address: address(deliveryAddress),
      totals: { sum_invoice_lines_amount: money(document.totalPriceExcludingTax), total_without_vat: money(document.totalPriceExcludingTax), total_with_vat: money(document.totalPrice), amount_due_for_payment: money(document.totalPrice), total_vat_amount: { value: money(totalVat), currency_code: document.currencyCode ?? 'EUR' } },
      vat_break_down: [...vat.entries()].map(([rate, item]) => ({ vat_category_code: rate ? 'S' : 'Z', vat_category_rate: money(rate), vat_category_taxable_amount: money(item.taxable), vat_category_tax_amount: money(item.tax) })), lines,
      notes: profile === 'peppol'
        ? [{ note: `Paiement à échéance le ${paymentDueDate}. Pénalités de retard : taux de refinancement de la BCE majoré de 10 points. Pas d’escompte pour paiement anticipé.` }]
        : [
            { subject_code: 'PMT', note: `Paiement à échéance le ${paymentDueDate}.` },
            { subject_code: 'PMD', note: 'En cas de retard de paiement, des pénalités sont exigibles au taux de refinancement de la BCE majoré de 10 points.' },
            { subject_code: 'AAB', note: 'Pas d’escompte pour paiement anticipé.' },
          ],
      payment_due_date: paymentDueDate,
      payment_terms: 'Paiement à échéance.',
    };
  }

  private getBusinessProcessType(operationNature: string | null): 'B1' | 'S1' {
    if (operationNature === 'GOODS') return 'B1';
    if (!operationNature || operationNature === 'SERVICES') return 'S1';
    throw new BadRequestException('Une facture mixte nécessite une qualification B2B spécifique avant sa transmission électronique.');
  }
}
