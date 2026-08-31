import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomUUID } from 'crypto';
import { PrismaService } from 'src/prisma/prisma.service';
import { SuperPdpOAuthService } from './superpdp-oauth.service';

type B2CCategoryCode = 'TLB1' | 'TPS1';

@Injectable()
export class SuperPdpEreportingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly oauth: SuperPdpOAuthService,
  ) {}

  async submitB2CTransaction(input: { companyId: string; documentId: string; userId: string }) {
    this.assertEnabled();
    const document = await this.prisma.document.findFirst({
      where: {
        id: input.documentId,
        companyId: input.companyId,
        type: 'INVOICE',
        company: {
          OR: [
            { ownerId: input.userId },
            { companyUsers: { some: { userId: input.userId, role: 'ADMIN', isHidden: false } } },
          ],
        },
      },
      include: { services: true, company: true },
    });
    if (!document) throw new NotFoundException('Facture introuvable ou accès non autorisé.');
    if (!document.sentAt) {
      throw new BadRequestException('La facture doit être envoyée avant sa déclaration e-reporting.');
    }
    if (document.clientType !== 'INDIVIDUAL') {
      throw new BadRequestException('Seules les factures B2C françaises peuvent être déclarées par cette route.');
    }
    if (!['FR', 'FRA', 'FRANCE'].includes(document.clientCountry.trim().toUpperCase())) {
      throw new BadRequestException('Cette route est réservée aux ventes B2C françaises.');
    }
    if (document.isVatExempt || document.company.isVatExempt) {
      throw new BadRequestException('Une opération exonérée ne peut pas être déclarée sans qualification réglementaire complémentaire.');
    }

    const transactions = this.buildTransactions(document.services, document.sentAt, document.currencyCode);
    const payload = {
      data: transactions,
      has_more: false,
    };
    const fingerprint = createHash('sha256').update(JSON.stringify(payload)).digest('hex');
    const existing = await this.prisma.electronicReportingSubmission.findFirst({
      where: { companyId: input.companyId, documentId: document.id, kind: 'TRANSACTION', provider: 'SUPER_PDP' },
    });
    if (existing?.status === 'SUBMITTED' || existing?.status === 'ACCEPTED') return existing;

    const submission = existing ?? await this.prisma.electronicReportingSubmission.create({
      data: {
        companyId: input.companyId,
        documentId: document.id,
        provider: 'SUPER_PDP',
        kind: 'TRANSACTION',
        periodStart: document.sentAt,
        periodEnd: document.sentAt,
        idempotencyKey: randomUUID(),
        payloadFingerprint: fingerprint,
      },
    });
    await this.prisma.electronicReportingSubmission.update({
      where: { id: submission.id }, data: { status: 'SUBMITTING', lastError: null },
    });

    try {
      const token = await this.oauth.getAccessToken(input.companyId);
      const response = await fetch('https://api.superpdp.tech/v1.beta/b2c_transactions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await this.readProviderResponse<{ data?: Array<{ id?: number | string }> }>(response);
      return await this.prisma.electronicReportingSubmission.update({
        where: { id: submission.id },
        data: {
          status: 'SUBMITTED',
          submittedAt: new Date(),
          providerReportId: result.data?.map((item) => item.id).filter((id) => id !== undefined).join(',') || null,
        },
      });
    } catch (error) {
      const reason = this.getProviderErrorMessage(error);
      await this.prisma.electronicReportingSubmission.update({
        where: { id: submission.id },
        data: { status: 'FAILED', lastError: reason },
      });
      console.error('[SuperPDP] Échec de la déclaration B2C', {
        documentId: document.id,
        reason,
      });
      throw new BadGatewayException(
        `Impossible de transmettre la déclaration B2C : ${reason}`,
      );
    }
  }

  /**
   * Declares each confirmed B2C payment only for sellers whose VAT is due on
   * collection. This is intentionally separate from transaction reporting:
   * installments and retry attempts are distinct real-world encashments.
   */
  async syncCollectedPaymentsForInvoice(documentId: string): Promise<void> {
    if (this.config.get<string>('SUPERPDP_TRANSACTION_EREPORTING_ENABLED') !== 'true') return;

    const document = await this.prisma.document.findUnique({
      where: { id: documentId },
      include: {
        company: true,
        services: true,
        payByBankPayments: {
          include: { payByBankPaymentAttempts: { where: { paymentStatus: 'SUCCESS' } } },
        },
        invoiceInstalmentPlan: {
          include: { invoicePaymentInstalments: { where: { instalmentStatus: 'SUCCESS' } } },
        },
      },
    });
    if (!document || document.type !== 'INVOICE') return;
    if (document.company.vatExigibility !== 'ON_COLLECTION') return;
    if (document.clientType !== 'INDIVIDUAL' || !['FR', 'FRA', 'FRANCE'].includes(document.clientCountry.trim().toUpperCase())) return;
    if (!document.sentAt || document.isVatExempt || document.company.isVatExempt) return;

    const encashments = [
      ...document.payByBankPayments.flatMap((payment) => payment.payByBankPaymentAttempts.map((attempt) => ({
        sourceReference: `payment-attempt:${attempt.id}`,
        amountInCents: payment.amountInCents,
        paidAt: attempt.updatedAt,
      }))),
      ...(document.invoiceInstalmentPlan?.invoicePaymentInstalments.map((instalment) => ({
        sourceReference: `instalment:${instalment.id}`,
        amountInCents: instalment.amountInCents,
        paidAt: instalment.paidAt ?? new Date(),
      })) ?? []),
      ...(document.invoiceStatus === 'PAID_MANUALLY' ? [{
        sourceReference: `manual:${document.id}`,
        amountInCents: Math.round(Number(document.totalPrice) * 100),
        paidAt: new Date(),
      }] : []),
    ];

    for (const encashment of encashments) {
      await this.submitB2CPayment({
        document,
        sourceReference: encashment.sourceReference,
        amountInCents: encashment.amountInCents,
        paidAt: encashment.paidAt,
      });
    }
  }

  async getOverview(input: { companyId: string; userId: string }) {
    await this.oauth.getConnectionStatus(input);
    const token = await this.oauth.getAccessToken(input.companyId);
    const headers = { Authorization: `Bearer ${token}` };
    try {
      const [transactions, payments, ereportings, submissions] = await Promise.all([
        this.getProviderCollection('/v1.beta/b2c_transactions?limit=100', headers),
        this.getProviderCollection('/v1.beta/b2c_payments?limit=100', headers),
        this.getProviderCollection('/v1.beta/ereportings?limit=100', headers),
        this.prisma.electronicReportingSubmission.findMany({
          where: { companyId: input.companyId, provider: 'SUPER_PDP' },
          orderBy: { createdAt: 'desc' },
          take: 100,
          include: { document: { select: { documentNumber: true, clientName: true } } },
        }),
      ]);
      return { transactions, payments, ereportings, submissions };
    } catch {
      throw new BadGatewayException('Impossible de synchroniser les données e-reporting SuperPDP.');
    }
  }

  private buildTransactions(
    services: Array<{ unitPrice: number; quantity: number; taxRate: number | null; itemType: 'GOODS' | 'SERVICES' }>,
    sentAt: Date,
    currency: string,
  ) {
    const groups: Array<{ itemType: 'GOODS' | 'SERVICES'; categoryCode: B2CCategoryCode }> = [
      { itemType: 'GOODS', categoryCode: 'TLB1' },
      { itemType: 'SERVICES', categoryCode: 'TPS1' },
    ];
    return groups.flatMap(({ itemType, categoryCode }) => {
      const lines = services.filter((service) => service.itemType === itemType);
      if (!lines.length) return [];
      const taxExclusive = lines.reduce((total, line) => total + Number(line.unitPrice) * Number(line.quantity), 0);
      const taxTotal = lines.reduce((total, line) => total + Number(line.unitPrice) * Number(line.quantity) * Number(line.taxRate ?? 0) / 100, 0);
      return [{
        date: this.toDate(sentAt),
        currency,
        category_code: categoryCode,
        tax_exclusive_amount: taxExclusive.toFixed(2),
        tax_total: taxTotal.toFixed(2),
        tax_subtotals: this.groupTaxSubtotals(lines),
        role_code: 'SE',
      }];
    });
  }

  private async submitB2CPayment(input: {
    document: {
      id: string;
      companyId: string;
      currencyCode: string;
      services: Array<{ unitPrice: number; quantity: number; taxRate: number | null }>;
    };
    sourceReference: string;
    amountInCents: number;
    paidAt: Date;
  }): Promise<void> {
    if (input.amountInCents <= 0) return;
    const existing = await this.prisma.electronicReportingSubmission.findUnique({
      where: { provider_sourcePaymentReference: { provider: 'SUPER_PDP', sourcePaymentReference: input.sourceReference } },
    });
    if (existing?.status === 'SUBMITTED' || existing?.status === 'ACCEPTED') return;

    const payload = {
      data: [{
        date: this.toDate(input.paidAt),
        subtotals: this.buildPaymentSubtotals(input.document.services, input.amountInCents, input.document.currencyCode),
      }],
    };
    const fingerprint = createHash('sha256').update(JSON.stringify(payload)).digest('hex');
    const submission = existing ?? await this.prisma.electronicReportingSubmission.create({
      data: {
        companyId: input.document.companyId,
        documentId: input.document.id,
        provider: 'SUPER_PDP',
        kind: 'PAYMENT',
        periodStart: input.paidAt,
        periodEnd: input.paidAt,
        sourcePaymentReference: input.sourceReference,
        idempotencyKey: randomUUID(),
        payloadFingerprint: fingerprint,
      },
    });
    await this.prisma.electronicReportingSubmission.update({
      where: { id: submission.id }, data: { status: 'SUBMITTING', lastError: null },
    });

    try {
      const token = await this.oauth.getAccessToken(input.document.companyId);
      const response = await fetch('https://api.superpdp.tech/v1.beta/b2c_payments', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await this.readProviderResponse<{ data?: Array<{ id?: number | string }> }>(response);
      await this.prisma.electronicReportingSubmission.update({
        where: { id: submission.id },
        data: {
          status: 'SUBMITTED',
          submittedAt: new Date(),
          providerReportId: result.data?.map((item) => item.id).filter((id) => id !== undefined).join(',') || null,
        },
      });
    } catch (error) {
      const reason = this.getProviderErrorMessage(error);
      await this.prisma.electronicReportingSubmission.update({
        where: { id: submission.id },
        data: { status: 'FAILED', lastError: reason },
      });
      console.error('[SuperPDP] Échec de la déclaration de paiement B2C', {
        documentId: input.document.id,
        sourceReference: input.sourceReference,
        reason,
      });
    }
  }

  private buildPaymentSubtotals(
    services: Array<{ unitPrice: number; quantity: number; taxRate: number | null }>,
    amountInCents: number,
    currencyCode: string,
  ) {
    const groups = new Map<number, number>();
    for (const service of services) {
      const taxRate = Number(service.taxRate ?? 0);
      const grossInCents = Math.round(Number(service.unitPrice) * Number(service.quantity) * (1 + taxRate / 100) * 100);
      groups.set(taxRate, (groups.get(taxRate) ?? 0) + grossInCents);
    }
    const totalInCents = [...groups.values()].reduce((total, amount) => total + amount, 0);
    let remaining = amountInCents;
    return [...groups.entries()].map(([taxRate, grossInCents], index, entries) => {
      const amount = index === entries.length - 1
        ? remaining
        : Math.round(amountInCents * grossInCents / totalInCents);
      remaining -= amount;
      return { tax_percent: taxRate.toFixed(2), amount: (amount / 100).toFixed(2), currency_code: currencyCode };
    });
  }

  private groupTaxSubtotals(services: Array<{ unitPrice: number; quantity: number; taxRate: number | null }>) {
    const groups = new Map<number, { taxable: number; tax: number }>();
    for (const service of services) {
      const rate = Number(service.taxRate ?? 0);
      const taxable = Number(service.unitPrice) * Number(service.quantity);
      const group = groups.get(rate) ?? { taxable: 0, tax: 0 };
      group.taxable += taxable;
      group.tax += taxable * rate / 100;
      groups.set(rate, group);
    }
    return [...groups.entries()].map(([tax_percent, values]) => ({
      tax_percent: tax_percent.toFixed(2),
      taxable_amount: values.taxable.toFixed(2),
      tax_total: values.tax.toFixed(2),
    }));
  }

  private toDate(value: Date): string { return value.toISOString().slice(0, 10); }

  private async getProviderCollection(path: string, headers: HeadersInit) {
    const response = await fetch(`https://api.superpdp.tech${path}`, { headers });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  }

  private async readProviderResponse<T>(response: Response): Promise<T> {
    const rawBody = await response.text();
    let body: unknown = rawBody;
    try {
      body = rawBody ? JSON.parse(rawBody) : null;
    } catch {
      // Some gateway failures are not JSON. Preserve their text below.
    }
    if (!response.ok) {
      throw new Error(this.formatProviderFailure(response.status, body));
    }
    return body as T;
  }

  private formatProviderFailure(status: number, body: unknown): string {
    const source = body as {
      message?: unknown;
      error?: { message?: unknown };
    } | null;
    const detail = typeof source?.message === 'string'
      ? source.message
      : typeof source?.error?.message === 'string'
        ? source.error.message
        : typeof body === 'string' && body.trim()
          ? body.trim()
          : 'Réponse sans détail';
    return `SuperPDP (${status}) : ${detail}`.slice(0, 4_000);
  }

  private getProviderErrorMessage(error: unknown): string {
    return error instanceof Error && error.message
      ? error.message.slice(0, 4_000)
      : 'SuperPDP n’a pas répondu à la déclaration.';
  }

  private assertEnabled() {
    if (this.config.get<string>('SUPERPDP_TRANSACTION_EREPORTING_ENABLED') !== 'true') {
      throw new BadRequestException('L’e-reporting B2C SuperPDP n’est pas activé dans cet environnement.');
    }
  }
}
