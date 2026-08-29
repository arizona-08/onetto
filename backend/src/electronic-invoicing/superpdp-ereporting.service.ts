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

    const categoryCode = this.getCategory(document.operationNature);
    const taxSubtotals = this.groupTaxSubtotals(document.services);
    const taxExclusive = Number(document.totalPriceExcludingTax).toFixed(2);
    const taxTotal = (Number(document.totalPrice) - Number(document.totalPriceExcludingTax)).toFixed(2);
    const payload = {
      data: [{
        date: this.toDate(document.sentAt),
        currency: document.currencyCode,
        category_code: categoryCode,
        tax_exclusive_amount: taxExclusive,
        tax_total: taxTotal,
        tax_subtotals: taxSubtotals,
        role_code: 'SE',
      }],
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
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const result = await response.json() as { data?: Array<{ id?: number | string }> };
      return await this.prisma.electronicReportingSubmission.update({
        where: { id: submission.id },
        data: {
          status: 'SUBMITTED',
          submittedAt: new Date(),
          providerReportId: result.data?.[0]?.id === undefined ? null : String(result.data[0].id),
        },
      });
    } catch {
      await this.prisma.electronicReportingSubmission.update({
        where: { id: submission.id },
        data: { status: 'FAILED', lastError: 'SuperPDP a refusé ou n’a pas répondu à la déclaration B2C.' },
      });
      throw new BadGatewayException('Impossible de transmettre la déclaration B2C à SuperPDP.');
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

  private getCategory(operationNature: string | null): B2CCategoryCode {
    if (!operationNature || operationNature === 'SERVICES') return 'TPS1';
    if (operationNature === 'GOODS') return 'TLB1';
    throw new BadRequestException('Une facture mixte doit être séparée entre biens et services avant e-reporting.');
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

  private assertEnabled() {
    if (this.config.get<string>('SUPERPDP_TRANSACTION_EREPORTING_ENABLED') !== 'true') {
      throw new BadRequestException('L’e-reporting B2C SuperPDP n’est pas activé dans cet environnement.');
    }
  }
}
