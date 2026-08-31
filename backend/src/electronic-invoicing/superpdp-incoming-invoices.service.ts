import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { NotificationsService } from 'src/notifications/notifications.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { SuperPdpOAuthService } from './superpdp-oauth.service';

@Injectable()
export class SuperPdpIncomingInvoicesService {
  private readonly logger = new Logger(SuperPdpIncomingInvoicesService.name);
  constructor(private readonly prisma: PrismaService, private readonly oauth: SuperPdpOAuthService, private readonly notifications: NotificationsService) {}

  async synchronizeAll() {
    const connections = await this.prisma.electronicInvoicingConnection.findMany({ where: { provider: 'SUPER_PDP', status: 'ACTIVE' }, select: { companyId: true } });
    const results = await Promise.allSettled(connections.map(({ companyId }) => this.synchronizeCompany(companyId)));
    return { checked: connections.length, failed: results.filter((result) => result.status === 'rejected').length };
  }

  async synchronizeCompany(companyId: string) {
    const token = await this.oauth.getAccessToken(companyId);
    const url = new URL('https://api.superpdp.tech/v1.beta/invoices');
    // SuperPDP uses the compact `in`/`out` values, not `incoming`/`outgoing`.
    url.searchParams.set('direction', 'in');
    url.searchParams.set('limit', '100');
    url.searchParams.append('expand[]', 'en_invoice');
    url.searchParams.append('expand[]', 'en_invoice.seller');
    url.searchParams.append('expand[]', 'events');
    const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!response.ok) {
      const body = await response.text();
      throw new Error(
        `SuperPDP incoming invoices HTTP ${response.status}${body ? `: ${body}` : ''}`,
      );
    }
    const payload = await response.json() as { data?: Array<Record<string, unknown>>; has_after?: boolean };
    for (const invoice of payload.data ?? []) await this.upsertIncoming(companyId, invoice);
  }

  private async upsertIncoming(companyId: string, invoice: Record<string, unknown>) {
    const providerInvoiceId = String(invoice.id ?? '');
    if (!providerInvoiceId) return;
    const existing = await this.prisma.receivedElectronicInvoice.findUnique({ where: { companyId_provider_providerInvoiceId: { companyId, provider: 'SUPER_PDP', providerInvoiceId } } });
    const en = (invoice.en_invoice ?? {}) as Record<string, any>;
    const seller = (en.seller ?? {}) as Record<string, any>;
    const totals = (en.totals ?? {}) as Record<string, any>;
    const invoiceData = (en.invoice ?? {}) as Record<string, any>;
    const totalExcludingTax = Number(totals.total_without_vat ?? totals.tax_exclusive_amount ?? totals.line_total_amount ?? 0);
    const totalIncludingTax = Number(totals.total_with_vat ?? totals.tax_inclusive_amount ?? totals.grand_total_amount ?? totalExcludingTax);
    const totalVat = Number(totals.total_vat_amount?.value ?? totals.tax_total_amount ?? totalIncludingTax - totalExcludingTax);
    const invoiceNumber = en.number ?? invoiceData.id ?? en.id ?? null;
    await this.prisma.receivedElectronicInvoice.upsert({
      where: { companyId_provider_providerInvoiceId: { companyId, provider: 'SUPER_PDP', providerInvoiceId } },
      create: { companyId, provider: 'SUPER_PDP', providerInvoiceId, supplierSiren: seller.legal_registration_identifier?.value ?? seller.global_id?.value ?? null, supplierName: seller.name ?? null, invoiceNumber, issuedAt: this.parseDate(en.issue_date), dueAt: this.parseDate(en.payment_due_date), currencyCode: en.currency_code ?? 'EUR', totalExcludingTax, totalVat, totalIncludingTax, providerStatus: this.latestStatus(invoice.events), documentFormat: 'original', metadata: invoice as Prisma.InputJsonValue, lastSyncedAt: new Date() },
      update: { supplierSiren: seller.legal_registration_identifier?.value ?? seller.global_id?.value ?? null, supplierName: seller.name ?? null, invoiceNumber, issuedAt: this.parseDate(en.issue_date), dueAt: this.parseDate(en.payment_due_date), currencyCode: en.currency_code ?? 'EUR', totalExcludingTax, totalVat, totalIncludingTax, providerStatus: this.latestStatus(invoice.events), metadata: invoice as Prisma.InputJsonValue, lastSyncedAt: new Date() },
    });
    if (!existing) await this.notifications.notifyCompany({ companyId, type: 'SUPPLIER_INVOICE_RECEIVED', title: 'Nouvelle facture fournisseur', message: `${seller.name ?? 'Un fournisseur'} vous a envoyé une facture${invoiceNumber ? ` ${invoiceNumber}` : ''}.`, href: '/notifications?view=supplier-invoices', deduplicationKey: `superpdp-incoming:${providerInvoiceId}`, metadata: { providerInvoiceId } });
  }
  private parseDate(value: unknown) { const date = value ? new Date(String(value)) : null; return date && !Number.isNaN(date.valueOf()) ? date : null; }
  private latestStatus(events: unknown) { return Array.isArray(events) ? events.at(-1)?.status_code ?? null : null; }
}
