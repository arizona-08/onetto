import {
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from 'src/prisma/prisma.service';
import type { User } from 'src/types/extended-request.types';
import { InvoicePaymentStatusService } from 'src/invoice-payments/invoice-payment-status.service';
import { GoCardlessOAuthService } from './gocardless-oauth.service';
import { GoCardlessPaymentWebhookHandler } from './webhook-handlers/gocardless-payment-webhook.handler';

const HOUR = 60 * 60 * 1000;

@Injectable()
export class GoCardlessReconciliationService {
  private readonly logger = new Logger(GoCardlessReconciliationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly oauth: GoCardlessOAuthService,
    private readonly paymentHandler: GoCardlessPaymentWebhookHandler,
    private readonly invoiceStatus: InvoicePaymentStatusService,
  ) {}

  async reconcileInvoice(invoiceId: string, user: User) {
    const plan = await this.prisma.invoiceInstalmentPlan.findUnique({
      where: { invoiceId },
      select: {
        id: true,
        lastReconciledAt: true,
        invoice: {
          select: {
            type: true,
            company: {
              select: {
                ownerId: true,
                status: true,
                companyUsers: {
                  where: { userId: user.id, role: 'ADMIN', isHidden: false },
                  select: { id: true },
                },
              },
            },
          },
        },
      },
    });
    if (!plan || plan.invoice.type !== 'INVOICE') {
      throw new NotFoundException('Échéancier introuvable.');
    }
    const company = plan.invoice.company;
    if (
      company.status !== 'ACTIVE' ||
      (company.ownerId !== user.id && company.companyUsers.length === 0)
    ) {
      throw new ForbiddenException(
        'Vous ne pouvez pas actualiser cette facture.',
      );
    }
    if (
      plan.lastReconciledAt &&
      plan.lastReconciledAt.getTime() > Date.now() - 5 * 60_000
    ) {
      throw new HttpException(
        'Les paiements ont déjà été actualisés récemment.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    return this.reconcilePaymentPlan(plan.id);
  }

  async reconcilePaymentPlan(planId: string) {
    const now = new Date();
    const lease = new Date(now.getTime() + 15 * 60_000);
    const claimed = await this.prisma.invoiceInstalmentPlan.updateMany({
      where: {
        id: planId,
        OR: [
          { reconciliationLeaseUntil: null },
          { reconciliationLeaseUntil: { lte: now } },
        ],
      },
      data: { reconciliationLeaseUntil: lease },
    });
    if (claimed.count !== 1) {
      throw new ConflictException('Une actualisation est déjà en cours.');
    }
    try {
      const result = await this.reconcileClaimedPlan(planId);
      const interval = result.allPaid
        ? result.lastPaidAt &&
          result.lastPaidAt.getTime() < Date.now() - 45 * 24 * HOUR
          ? 7 * 24 * HOUR
          : 24 * HOUR
        : result.allFailed
          ? 24 * HOUR
          : 6 * HOUR;
      await this.prisma.invoiceInstalmentPlan.update({
        where: { id: planId },
        data: {
          lastReconciledAt: new Date(),
          nextReconciliationAt: new Date(Date.now() + interval),
          reconciliationFailureCount: 0,
          reconciliationLeaseUntil: null,
        },
      });
      return {
        message:
          'Les informations de paiement ont été actualisées avec GoCardless.',
        requiresPaymentReview: result.requiresPaymentReview,
      };
    } catch (error) {
      const plan = await this.prisma.invoiceInstalmentPlan.findUnique({
        where: { id: planId },
        select: { reconciliationFailureCount: true },
      });
      const count = (plan?.reconciliationFailureCount ?? 0) + 1;
      await this.prisma.invoiceInstalmentPlan.update({
        where: { id: planId },
        data: {
          reconciliationFailureCount: count,
          nextReconciliationAt: new Date(
            Date.now() + Math.min(6 * 2 ** Math.min(count, 5), 168) * HOUR,
          ),
          reconciliationLeaseUntil: null,
        },
      });
      throw error;
    }
  }

  async reconcilePayment(companyId: string, providerPaymentId: string) {
    const instalment = await this.prisma.invoicePaymentInstalment.findUnique({
      where: { providerPaymentId },
      select: {
        id: true,
        amountInCents: true,
        instalmentStatus: true,
        automaticRetryScheduled: true,
        manualRetryRequestedAt: true,
        lastProviderEventAt: true,
        invoiceInstalmentPlan: {
          select: {
            providerScheduledId: true,
            providerMandateId: true,
            invoiceId: true,
            invoice: { select: { companyId: true, invoiceStatus: true } },
          },
        },
      },
    });
    if (
      !instalment ||
      instalment.invoiceInstalmentPlan.invoice.companyId !== companyId
    ) {
      throw new NotFoundException(
        'Paiement introuvable pour cette entreprise.',
      );
    }
    const client = await this.oauth.getClientForCompany(companyId);
    const payment = await client.payments.find(providerPaymentId);
    if (
      !payment ||
      payment.links?.instalment_schedule !==
        instalment.invoiceInstalmentPlan.providerScheduledId ||
      (instalment.invoiceInstalmentPlan.providerMandateId &&
        payment.links?.mandate !==
          instalment.invoiceInstalmentPlan.providerMandateId) ||
      Number(payment.amount) !== instalment.amountInCents
    ) {
      throw new ConflictException('Correspondance bancaire incohérente.');
    }
    if (
      instalment.invoiceInstalmentPlan.invoice.invoiceStatus === 'PAID_MANUALLY'
    ) {
      return;
    }
    await this.paymentHandler.syncInstalmentStatus(
      instalment,
      payment.status as string,
    );
  }

  private async reconcileClaimedPlan(planId: string) {
    const plan = await this.prisma.invoiceInstalmentPlan.findUniqueOrThrow({
      where: { id: planId },
      select: {
        invoiceId: true,
        providerScheduledId: true,
        providerMandateId: true,
        invoice: { select: { companyId: true, invoiceStatus: true } },
        invoicePaymentInstalments: {
          select: {
            id: true,
            providerPaymentId: true,
            amountInCents: true,
            dueDate: true,
            instalmentStatus: true,
            automaticRetryScheduled: true,
            manualRetryRequestedAt: true,
            lastProviderEventAt: true,
          },
        },
      },
    });
    if (!plan.providerScheduledId) {
      return {
        allPaid: false,
        allFailed: false,
        lastPaidAt: null,
        requiresPaymentReview: true,
      };
    }
    const client = await this.oauth.getClientForCompany(plan.invoice.companyId);
    const schedule = await client.instalmentSchedules.find(
      plan.providerScheduledId,
    );
    if (!schedule || schedule.id !== plan.providerScheduledId) {
      throw new ConflictException('Échéancier GoCardless introuvable.');
    }
    if (
      plan.providerMandateId &&
      schedule.links?.mandate !== plan.providerMandateId
    ) {
      throw new ConflictException('Mandat GoCardless incohérent.');
    }
    const scheduleIds = schedule.links?.payments ?? [];
    if (new Set(scheduleIds).size !== scheduleIds.length) {
      throw new ConflictException('Paiements GoCardless dupliqués.');
    }
    const ids = [
      ...new Set([
        ...scheduleIds,
        ...plan.invoicePaymentInstalments
          .map((item) => item.providerPaymentId)
          .filter((id): id is string => !!id),
      ]),
    ];
    let requiresPaymentReview = false;
    const payments = await Promise.all(
      ids.map((id) => client.payments.find(id)),
    );
    for (let index = 0; index < ids.length; index++) {
      const id = ids[index];
      const payment = payments[index];
      if (
        !payment ||
        payment.links?.instalment_schedule !== plan.providerScheduledId ||
        (plan.providerMandateId &&
          payment.links?.mandate !== plan.providerMandateId)
      ) {
        requiresPaymentReview = true;
        continue;
      }
      let instalment = plan.invoicePaymentInstalments.find(
        (item) => item.providerPaymentId === id,
      );
      if (!instalment) {
        const matches = plan.invoicePaymentInstalments.filter(
          (item) =>
            !item.providerPaymentId &&
            item.amountInCents === Number(payment.amount) &&
            item.dueDate.toISOString().slice(0, 10) === payment.charge_date,
        );
        const competingPayments = payments.filter(
          (other) =>
            other &&
            !plan.invoicePaymentInstalments.some(
              (item) => item.providerPaymentId === other.id,
            ) &&
            other.amount === payment.amount &&
            other.charge_date === payment.charge_date,
        );
        if (matches.length !== 1 || competingPayments.length !== 1) {
          requiresPaymentReview = true;
          continue;
        }
        instalment = matches[0];
        const elsewhere = await this.prisma.invoicePaymentInstalment.findUnique(
          {
            where: { providerPaymentId: id },
            select: { id: true },
          },
        );
        if (elsewhere) {
          requiresPaymentReview = true;
          continue;
        }
        const bound = await this.prisma.invoicePaymentInstalment.updateMany({
          where: { id: instalment.id, providerPaymentId: null },
          data: { providerPaymentId: id },
        });
        if (bound.count !== 1) {
          requiresPaymentReview = true;
          continue;
        }
        instalment.providerPaymentId = id;
      }
      if (Number(payment.amount) !== instalment.amountInCents) {
        requiresPaymentReview = true;
        continue;
      }
      if (plan.invoice.invoiceStatus !== 'PAID_MANUALLY') {
        await this.paymentHandler.syncInstalmentStatus(
          {
            ...instalment,
            invoiceInstalmentPlan: { invoiceId: plan.invoiceId },
          },
          payment.status as string,
        );
      }
    }
    await this.invoiceStatus.refreshFromInstalment(plan.invoiceId);
    const statuses = await this.prisma.invoicePaymentInstalment.findMany({
      where: { invoiceInstalmentPlan: { invoiceId: plan.invoiceId } },
      select: {
        instalmentStatus: true,
        paidAt: true,
        providerPaymentId: true,
        dueDate: true,
      },
    });
    requiresPaymentReview ||= statuses.some(
      (item) => !item.providerPaymentId && item.dueDate <= new Date(),
    );
    const paidDates = statuses
      .map((item) => item.paidAt)
      .filter((date): date is Date => date !== null);
    return {
      allPaid:
        statuses.length > 0 &&
        statuses.every((s) => s.instalmentStatus === 'SUCCESS'),
      allFailed:
        statuses.length > 0 &&
        statuses.every((s) => s.instalmentStatus === 'FAILED'),
      lastPaidAt: paidDates.length
        ? new Date(Math.max(...paidDates.map((date) => date.getTime())))
        : null,
      requiresPaymentReview,
    };
  }

  @Cron('0 0 */6 * * *', { timeZone: 'Europe/Paris' })
  async reconcileDuePlans(): Promise<void> {
    const now = new Date();
    const plans = await this.prisma.invoiceInstalmentPlan.findMany({
      where: {
        providerScheduledId: { not: null },
        invoice: {
          company: {
            companyPaymentAccount: { is: { provider: 'GOCARDLESS' } },
          },
        },
        OR: [
          { nextReconciliationAt: null },
          { nextReconciliationAt: { lte: now } },
        ],
        invoicePaymentInstalments: {
          some: {
            OR: [
              { providerPaymentId: { not: null } },
              { dueDate: { lte: now } },
            ],
          },
        },
      },
      select: { id: true },
      orderBy: { id: 'asc' },
      take: 50,
    });
    for (const plan of plans) {
      try {
        await this.reconcilePaymentPlan(plan.id);
      } catch (error) {
        this.logger.warn(
          `Réconciliation échouée pour l'échéancier ${plan.id}: ${error instanceof Error ? error.name : 'erreur inconnue'}`,
        );
      }
    }
  }
}
