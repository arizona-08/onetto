import { BadGatewayException, BadRequestException, Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { NotificationsService } from 'src/notifications/notifications.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { S3StorageService } from 'src/storage/s3-storage.service';
import { SuperPdpOAuthService } from './superpdp-oauth.service';

@Injectable()
export class SuperPdpIncomingInvoicesService {
  private readonly logger = new Logger(SuperPdpIncomingInvoicesService.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly oauth: SuperPdpOAuthService,
    private readonly notifications: NotificationsService,
    private readonly storage: S3StorageService,
  ) {}

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

  async downloadInvoice(companyId: string, invoiceId: string) {
    const invoice = await this.prisma.receivedElectronicInvoice.findFirst({
      where: { id: invoiceId, companyId, provider: 'SUPER_PDP' },
      select: {
        providerInvoiceId: true,
        invoiceNumber: true,
        originalArchiveKey: true,
        originalSha256: true,
        originalContentType: true,
        originalFileName: true,
      },
    });
    if (!invoice) {
      throw new BadRequestException('Facture fournisseur introuvable.');
    }

    const original = invoice.originalArchiveKey
      ? {
          buffer: await this.storage.getArchivedFacturX(invoice.originalArchiveKey, invoice.originalSha256),
          contentType: invoice.originalContentType ?? 'application/octet-stream',
          fileName: invoice.originalFileName ?? `facture-fournisseur-${invoiceId}`,
        }
      : await this.fetchOriginalInvoice(companyId, invoice.providerInvoiceId, invoice.invoiceNumber, invoiceId);
    const isPdf = original.contentType.toLowerCase().includes('pdf') || original.buffer.subarray(0, 4).toString() === '%PDF';
    const baseName = (invoice.invoiceNumber ?? `facture-fournisseur-${invoiceId}`)
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .slice(0, 120);

    if (isPdf) {
      return {
        buffer: original.buffer,
        contentType: 'application/pdf',
        fileName: `${baseName}.pdf`,
      };
    }

    const token = await this.oauth.getAccessToken(companyId);
    const converted = await fetch(
      `https://api.superpdp.tech/v1.beta/invoices/${encodeURIComponent(invoice.providerInvoiceId)}?format=factur-x`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/pdf',
        },
      },
    );
    if (!converted.ok) {
      const body = await converted.text();
      this.logger.error(`SuperPDP Factur-X conversion HTTP ${converted.status}${body ? `: ${body}` : ''}`);
      throw new BadGatewayException('Impossible de convertir cette facture XML en PDF Factur-X.');
    }
    const facturX = Buffer.from(await converted.arrayBuffer());
    if (facturX.subarray(0, 4).toString() !== '%PDF') {
      throw new BadGatewayException('SuperPDP n’a pas retourné un PDF Factur-X valide.');
    }

    return {
      buffer: facturX,
      contentType: 'application/pdf',
      fileName: `factur-x-${baseName}.pdf`,
    };
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
    const stored = await this.prisma.receivedElectronicInvoice.upsert({
      where: { companyId_provider_providerInvoiceId: { companyId, provider: 'SUPER_PDP', providerInvoiceId } },
      create: { companyId, provider: 'SUPER_PDP', providerInvoiceId, supplierSiren: seller.legal_registration_identifier?.value ?? seller.global_id?.value ?? null, supplierName: seller.name ?? null, invoiceNumber, issuedAt: this.parseDate(en.issue_date), dueAt: this.parseDate(en.payment_due_date), currencyCode: en.currency_code ?? 'EUR', totalExcludingTax, totalVat, totalIncludingTax, providerStatus: this.latestStatus(invoice.events), documentFormat: 'original', metadata: invoice as Prisma.InputJsonValue, lastSyncedAt: new Date() },
      update: { supplierSiren: seller.legal_registration_identifier?.value ?? seller.global_id?.value ?? null, supplierName: seller.name ?? null, invoiceNumber, issuedAt: this.parseDate(en.issue_date), dueAt: this.parseDate(en.payment_due_date), currencyCode: en.currency_code ?? 'EUR', totalExcludingTax, totalVat, totalIncludingTax, providerStatus: this.latestStatus(invoice.events), metadata: invoice as Prisma.InputJsonValue, lastSyncedAt: new Date() },
    });
    if (!stored.originalArchiveKey) {
      try {
        const original = await this.fetchOriginalInvoice(companyId, providerInvoiceId, invoiceNumber, stored.id);
        const archive = await this.storage.archiveSupplierInvoiceOriginal({
          companyId,
          invoiceId: stored.id,
          content: original.buffer,
          contentType: original.contentType,
          fileExtension: original.fileExtension,
        });
        await this.prisma.receivedElectronicInvoice.update({
          where: { id: stored.id },
          data: {
            originalArchiveKey: archive.key,
            originalSha256: archive.sha256,
            originalContentType: original.contentType,
            originalFileName: original.fileName,
            originalArchivedAt: archive.archivedAt,
            originalArchiveError: null,
          },
        });
      } catch (error) {
        const message = error instanceof Error ? error.message.slice(0, 1000) : 'Erreur inconnue.';
        this.logger.error(`Archivage S3 de la facture fournisseur ${providerInvoiceId} impossible : ${message}`);
        await this.prisma.receivedElectronicInvoice.update({
          where: { id: stored.id },
          data: { originalArchiveError: message },
        });
      }
    }
    if (!existing) await this.notifications.notifyCompany({ companyId, type: 'SUPPLIER_INVOICE_RECEIVED', title: 'Nouvelle facture fournisseur', message: `${seller.name ?? 'Un fournisseur'} vous a envoyé une facture${invoiceNumber ? ` ${invoiceNumber}` : ''}.`, href: '/notifications?view=supplier-invoices', deduplicationKey: `superpdp-incoming:${providerInvoiceId}`, metadata: { providerInvoiceId } });
  }

  private async fetchOriginalInvoice(companyId: string, providerInvoiceId: string, invoiceNumber: string | null, invoiceId: string) {
    const token = await this.oauth.getAccessToken(companyId);
    const response = await fetch(
      `https://api.superpdp.tech/v1.beta/invoices/${encodeURIComponent(providerInvoiceId)}/download`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (!response.ok) {
      const body = await response.text();
      this.logger.error(`SuperPDP invoice download HTTP ${response.status}${body ? `: ${body}` : ''}`);
      throw new BadGatewayException('Le document de la facture fournisseur est indisponible pour le moment.');
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    const responseContentType = response.headers.get('content-type')?.split(';')[0].trim().toLowerCase();
    const isPdf = responseContentType === 'application/pdf' || buffer.subarray(0, 4).toString() === '%PDF';
    const isXml = responseContentType?.includes('xml') || buffer.subarray(0, 5).toString().startsWith('<?xml');
    if (!isPdf && !isXml) throw new BadGatewayException('SuperPDP a retourné un format de facture fournisseur non pris en charge.');
    const baseName = (invoiceNumber ?? `facture-fournisseur-${invoiceId}`)
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .slice(0, 120);
    return {
      buffer,
      contentType: isPdf ? 'application/pdf' : 'application/xml',
      fileExtension: isPdf ? 'pdf' as const : 'xml' as const,
      fileName: `${baseName}.${isPdf ? 'pdf' : 'xml'}`,
    };
  }
  private parseDate(value: unknown) { const date = value ? new Date(String(value)) : null; return date && !Number.isNaN(date.valueOf()) ? date : null; }
  private latestStatus(events: unknown) { return Array.isArray(events) ? events.at(-1)?.status_code ?? null : null; }
}
