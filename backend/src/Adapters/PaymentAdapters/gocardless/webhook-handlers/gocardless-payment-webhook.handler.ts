import { ConflictException, Injectable, Logger } from '@nestjs/common';
import { WebhookHandlerInterface } from '../../Interfaces/WebhookHandler.interface';
import { GoCardlessEventDto } from './dtos/event.dto';
import { GoCardlessOAuthService } from '../gocardless-oauth.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { GoCardlessStatusMatcherService } from '../gocardless-status-matcher.service';
import { InvoicePaymentStatusService } from 'src/invoice-payments/invoice-payment-status.service';

@Injectable()
export class GoCardlessPaymentWebhookHandler implements WebhookHandlerInterface {
  private readonly logger = new Logger(GoCardlessPaymentWebhookHandler.name);
  constructor(
    private readonly gocardlessOAuthService: GoCardlessOAuthService,
    private readonly gocardlessStatusMatcherService: GoCardlessStatusMatcherService,
    private readonly prismaService: PrismaService,
    private readonly invoicePaymentStatusService: InvoicePaymentStatusService,
  ) {}

  async handleWebhook(webhookEvent: GoCardlessEventDto): Promise<void> {
    if (!this.isRelevantAction(webhookEvent.action)) {
      return;
    }

    const paymentId = webhookEvent.links.payment;
    if (!paymentId) {
      this.logger.warn(`Webhook de paiement ${webhookEvent.id} sans payment.`);
      return;
    }

    // The event only guarantees links.payment. Read the current resource rather
    // than relying on event ordering or an optional billing_request link.
    const client =
      await this.gocardlessOAuthService.getClientForProviderAccount(
        webhookEvent.organisation_id,
      );
    const payment = await client.payments.find(paymentId);
    if (!payment) {
      this.logger.warn(
        `Payment ${paymentId} introuvable pour l'événement ${webhookEvent.id}.`,
      );
      return;
    }

    const contractStageId = payment.metadata?.contract_stage_id;
    const contractPayment = await this.prismaService.contractStagePayment.findFirst({
      where: {
        OR: [
          { providerPaymentId: paymentId },
          ...(contractStageId ? [{ stageId: contractStageId }] : []),
        ],
      },
      include: {
        stage: {
          include: {
            invoice: true,
            plan: { include: { estimate: { select: { companyId: true } } } },
          },
        },
      },
    });
    if (contractPayment) {
      if (contractPayment.manualSettlementAt) {
        if (['confirmed', 'paid_out'].includes(payment.status as string)) {
          await this.prismaService.contractStagePayment.update({
            where: { id: contractPayment.id },
            data: { needsAccountingReview: true },
          });
          throw new ConflictException('Ce prélèvement est encaissé chez GoCardless alors que la facture est réglée manuellement. Vérification nécessaire.');
        }
        return;
      }
      if (contractPayment.status === 'UNCERTAIN' && payment.status === 'failed') return;
      const plan = contractPayment.stage.plan;
      const account = await this.prismaService.companyPaymentAccount.findFirst({
        where: {
          companyId: plan.estimate.companyId,
          provider: 'GOCARDLESS',
          providerAccountId: webhookEvent.organisation_id,
        },
      });
      if (!account || !plan.providerMandateId || payment.links?.mandate !== plan.providerMandateId ||
        Number(payment.amount) !== contractPayment.amountInCents ||
        (contractPayment.providerPaymentId && contractPayment.providerPaymentId !== paymentId)) {
        throw new ConflictException('Paiement contractuel GoCardless incohérent.');
      }
      const status = ['confirmed', 'paid_out'].includes(payment.status as string)
        ? 'SUCCESS' as const
        : ['failed', 'charged_back'].includes(payment.status as string)
          ? 'FAILED' as const
          : payment.status === 'cancelled' ? 'CANCELLED' as const
            : payment.status === 'submitted' ? 'IN_PROGRESS' as const : 'PENDING' as const;
      const invoiceStatus = status === 'SUCCESS' ? 'PAID' as const
        : status === 'FAILED' || status === 'CANCELLED' ? 'REJECTED' as const
          : 'PAYMENT_IN_PROGRESS' as const;
      await this.prismaService.$transaction(async (tx) => {
        await tx.contractStagePayment.update({
          where: { id: contractPayment.id },
          data: {
            providerPaymentId: paymentId,
            status,
            chargeDate: payment.charge_date ? new Date(`${payment.charge_date}T12:00:00Z`) : null,
            failureReason: status === 'FAILED' ? String(webhookEvent.details?.description ?? 'Prélèvement échoué').slice(0, 500) : null,
            ...(webhookEvent.action === 'failed' ? { automaticRetryScheduled: webhookEvent.details?.will_attempt_retry === true } :
              status !== 'FAILED' ? { automaticRetryScheduled: false } : {}),
            manualRetryRequestedAt: null,
            ...(contractPayment.status === 'SUCCESS' && (status === 'FAILED' || status === 'CANCELLED')
              ? { needsAccountingReview: true } : {}),
          },
        });
        if (contractPayment.stage.invoice) {
          await tx.document.update({ where: { id: contractPayment.stage.invoice.id }, data: { invoiceStatus } });
        }
      });
      if (contractPayment.stage.invoice) {
        await this.invoicePaymentStatusService.syncContractPaymentResult(
          contractPayment.stage.invoice.id,
          contractPayment.status,
          status,
          paymentId,
        );
      }
      return;
    }

    const instalmentScheduleId = payment.links?.instalment_schedule;
    if (instalmentScheduleId) {
      const instalment =
        await this.prismaService.invoicePaymentInstalment.findUnique({
          where: { providerPaymentId: paymentId },
          select: {
            id: true,
            amountInCents: true,
            instalmentStatus: true,
            automaticRetryScheduled: true,
            manualRetryRequestedAt: true,
            lastProviderEventAt: true,
            invoiceInstalmentPlan: {
              select: { invoiceId: true, providerScheduledId: true },
            },
          },
        });
      if (instalment) {
        if (
          instalment.invoiceInstalmentPlan.providerScheduledId &&
          instalment.invoiceInstalmentPlan.providerScheduledId !==
            instalmentScheduleId
        ) {
          throw new ConflictException(
            'Payment GoCardless associé à un autre échéancier.',
          );
        }
        await this.syncInstalmentStatus(
          instalment,
          payment.status as string,
          webhookEvent.action,
          webhookEvent.details.will_attempt_retry === true,
          webhookEvent.created_at,
        );
      } else {
        await this.syncUnmappedInstalmentPayment(
          client,
          instalmentScheduleId,
          paymentId,
          payment.status as string,
          webhookEvent.action,
          webhookEvent.details.will_attempt_retry === true,
          webhookEvent.created_at,
          Number(payment.amount),
          payment.charge_date ?? null,
          payment.links?.mandate ?? null,
        );
      }
      return;
    }

    const attempt = await this.prismaService.payByBankPaymentAttempt.findFirst({
      where: { providerPaymentId: paymentId },
      select: { id: true, payByBankPaymentId: true, paymentStatus: true },
    });
    if (attempt) {
      await this.syncKnownPaymentAttemptStatus(
        attempt,
        payment.status as string,
      );
      return;
    }

    // Compatibility fallback for existing attempts created before the payment
    // identifier was persisted. It is not the primary routing mechanism.
    const billingRequestId = webhookEvent.links.billing_request;
    if (billingRequestId) {
      const payByBankPayment =
        await this.prismaService.payByBankPayment.findUnique({
          where: { providerReference: billingRequestId },
          select: { id: true },
        });
      if (payByBankPayment) {
        await this.syncPaymentAttemptStatus(
          billingRequestId,
          payByBankPayment.id,
          paymentId,
          payment.status as string,
        );
        return;
      }
    }

    this.logger.warn(
      `Payment GoCardless ${paymentId} non associé à un paiement Onetto.`,
    );
  }

  isRelevantAction(action: string): boolean {
    const relevantActions = [
      'created',
      'submitted',
      'confirmed',
      'paid_out',
      'failed',
      'resubmission_requested',
      'charged_back',
      'cancelled',
    ];

    return relevantActions.includes(action);
  }

  private canUpdateStatus(
    existingStatus:
      | 'PENDING'
      | 'PAYMENT_IN_PROGRESS'
      | 'SUCCESS'
      | 'FAILED'
      | 'OVERDUE'
      | null
      | undefined,
    nextStatus: 'PENDING' | 'PAYMENT_IN_PROGRESS' | 'SUCCESS' | 'FAILED',
  ): boolean {
    if (existingStatus === nextStatus) return false;
    if (existingStatus === 'SUCCESS') return nextStatus === 'FAILED';
    if (nextStatus === 'SUCCESS' || nextStatus === 'PAYMENT_IN_PROGRESS')
      return true;
    return !(
      existingStatus === 'PAYMENT_IN_PROGRESS' && nextStatus === 'PENDING'
    );
  }

  async syncInstalmentStatus(
    instalment: {
      id: string;
      amountInCents: number;
      instalmentStatus:
        | 'PENDING'
        | 'PAYMENT_IN_PROGRESS'
        | 'SUCCESS'
        | 'FAILED'
        | 'OVERDUE';
      automaticRetryScheduled: boolean;
      manualRetryRequestedAt: Date | null;
      lastProviderEventAt: Date | null;
      invoiceInstalmentPlan: {
        invoiceId: string;
        providerScheduledId?: string | null;
      };
    },
    paymentStatus: string,
    eventAction?: string,
    willAttemptRetry = false,
    eventCreatedAt?: string,
  ): Promise<void> {
    const eventAt = eventCreatedAt ? new Date(eventCreatedAt) : null;
    const staleEvent =
      !!eventAt &&
      !!instalment.lastProviderEventAt &&
      eventAt < instalment.lastProviderEventAt;
    const mappedStatus =
      eventAction === 'resubmission_requested' &&
      ['pending_submission', 'pending_customer_approval'].includes(
        paymentStatus,
      )
        ? 'PAYMENT_IN_PROGRESS'
        : this.gocardlessStatusMatcherService.matchPaymentAttemptStatus(
            paymentStatus,
          );
    const automaticRetryScheduled =
      paymentStatus !== 'failed'
        ? false
        : staleEvent
          ? instalment.automaticRetryScheduled
          : eventAction === 'failed'
            ? willAttemptRetry
            : eventAction === 'resubmission_requested'
              ? false
              : instalment.automaticRetryScheduled;
    const releaseManualRetry =
      !!instalment.manualRetryRequestedAt &&
      !!eventCreatedAt &&
      eventAt !== null &&
      eventAt >= instalment.manualRetryRequestedAt &&
      (paymentStatus !== 'failed' || eventAction === 'failed') &&
      [
        'resubmission_requested',
        'submitted',
        'confirmed',
        'paid_out',
        'failed',
        'charged_back',
      ].includes(eventAction ?? '');
    const canUpdateStatus = this.canUpdateStatus(
      instalment.instalmentStatus,
      mappedStatus,
    );
    if (
      !canUpdateStatus &&
      instalment.automaticRetryScheduled === automaticRetryScheduled &&
      (staleEvent ||
        !eventAt ||
        (instalment.lastProviderEventAt !== null &&
          eventAt <= instalment.lastProviderEventAt)) &&
      !releaseManualRetry
    ) {
      // The previous webhook may have persisted the instalment but failed
      // before the invoice could be recalculated. Reconcile it on delivery.
      await this.invoicePaymentStatusService.refreshFromInstalment(
        instalment.invoiceInstalmentPlan.invoiceId,
      );
      return;
    }

    await this.prismaService.invoicePaymentInstalment.update({
      // Two distinct webhook events may read the same previous state. Only
      // the first may commit the transition and trigger its receipt/notice.
      where: {
        id: instalment.id,
        instalmentStatus: instalment.instalmentStatus,
        manualRetryRequestedAt: instalment.manualRetryRequestedAt,
        lastProviderEventAt: instalment.lastProviderEventAt,
      },
      data: {
        ...(canUpdateStatus ? { instalmentStatus: mappedStatus } : {}),
        automaticRetryScheduled,
        ...(!staleEvent && eventAt ? { lastProviderEventAt: eventAt } : {}),
        ...(releaseManualRetry ? { manualRetryRequestedAt: null } : {}),
        ...(canUpdateStatus && mappedStatus === 'SUCCESS'
          ? { paidAt: new Date() }
          : {}),
        ...(canUpdateStatus &&
        instalment.instalmentStatus === 'SUCCESS' &&
        mappedStatus === 'FAILED'
          ? { paidAt: null }
          : {}),
      },
    });
    await this.invoicePaymentStatusService.refreshFromInstalment(
      instalment.invoiceInstalmentPlan.invoiceId,
      canUpdateStatus && mappedStatus === 'SUCCESS'
        ? instalment.amountInCents
        : undefined,
    );
    if (
      canUpdateStatus &&
      mappedStatus === 'PAYMENT_IN_PROGRESS' &&
      eventAction === 'submitted'
    ) {
      await this.invoicePaymentStatusService.notifyPaymentSubmittedForInstalment(
        instalment.invoiceInstalmentPlan.invoiceId,
        instalment.amountInCents,
      );
    }
  }

  /** Bind an unknown Payment only when its amount and charge date identify one instalment. */
  private async syncUnmappedInstalmentPayment(
    client: Awaited<
      ReturnType<GoCardlessOAuthService['getClientForProviderAccount']>
    >,
    instalmentScheduleId: string,
    paymentId: string,
    paymentStatus: string,
    eventAction?: string,
    willAttemptRetry = false,
    eventCreatedAt?: string,
    paymentAmount?: number,
    chargeDate?: string | null,
    mandateId?: string | null,
  ): Promise<void> {
    const plan = await this.prismaService.invoiceInstalmentPlan.findFirst({
      where: { providerScheduledId: instalmentScheduleId },
      select: {
        invoiceId: true,
        providerMandateId: true,
        invoicePaymentInstalments: {
          select: {
            id: true,
            amountInCents: true,
            dueDate: true,
            providerPaymentId: true,
            instalmentStatus: true,
            automaticRetryScheduled: true,
            manualRetryRequestedAt: true,
            lastProviderEventAt: true,
          },
        },
      },
    });
    if (!plan) {
      this.logger.warn(
        `Instalment schedule GoCardless ${instalmentScheduleId} inconnu.`,
      );
      return;
    }

    const schedule =
      await client.instalmentSchedules.find(instalmentScheduleId);
    const ids = schedule?.links?.payments ?? [];
    if (
      !ids.includes(paymentId) ||
      !chargeDate ||
      !Number.isInteger(paymentAmount) ||
      (plan.providerMandateId && plan.providerMandateId !== mandateId)
    ) {
      this.logger.warn(
        `Payment ${paymentId} ne peut pas être relié à l'échéancier ${instalmentScheduleId}.`,
      );
      return;
    }
    const matches = plan.invoicePaymentInstalments.filter(
      (item) =>
        !item.providerPaymentId &&
        item.amountInCents === paymentAmount &&
        item.dueDate.toISOString().slice(0, 10) === chargeDate,
    );
    const competing = await Promise.all(
      ids
        .filter((id) => id !== paymentId)
        .map((id) => client.payments.find(id)),
    );
    if (
      matches.length !== 1 ||
      competing.some(
        (other) =>
          other &&
          !plan.invoicePaymentInstalments.some(
            (item) => item.providerPaymentId === other.id,
          ) &&
          Number(other.amount) === paymentAmount &&
          other.charge_date === chargeDate,
      )
    ) {
      this.logger.warn(
        `Payment ${paymentId}: association à une échéance ambiguë.`,
      );
      return;
    }
    const instalment = matches[0];
    const bound = await this.prismaService.invoicePaymentInstalment.updateMany({
      where: { id: instalment.id, providerPaymentId: null },
      data: { providerPaymentId: paymentId },
    });
    if (bound.count !== 1) return;
    await this.syncInstalmentStatus(
      {
        ...instalment,
        invoiceInstalmentPlan: { invoiceId: plan.invoiceId },
      },
      paymentStatus,
      eventAction,
      willAttemptRetry,
      eventCreatedAt,
    );
  }

  async syncKnownPaymentAttemptStatus(
    attempt: {
      id: string;
      payByBankPaymentId: string;
      paymentStatus:
        | 'PENDING'
        | 'PAYMENT_IN_PROGRESS'
        | 'SUCCESS'
        | 'FAILED'
        | null;
    },
    paymentStatus: string,
  ): Promise<void> {
    const mappedStatus =
      this.gocardlessStatusMatcherService.matchPaymentAttemptStatus(
        paymentStatus,
      );
    if (!this.canUpdateStatus(attempt.paymentStatus, mappedStatus)) return;

    const updated = await this.prismaService.payByBankPaymentAttempt.updateMany(
      {
        where: { id: attempt.id, paymentStatus: attempt.paymentStatus },
        data: { paymentStatus: mappedStatus },
      },
    );
    if (updated.count !== 1) return;
    await this.invoicePaymentStatusService.refreshFromPaymentAttempt(
      attempt.payByBankPaymentId,
      mappedStatus === 'SUCCESS',
    );
    if (mappedStatus === 'PAYMENT_IN_PROGRESS') {
      await this.invoicePaymentStatusService.notifyPaymentSubmittedForPayByBankPayment(
        attempt.payByBankPaymentId,
      );
    }
  }

  async syncPaymentAttemptStatus(
    billingRequestId: string,
    payByBankPaymentId: string,
    paymentId: string,
    paymentStatus: string,
  ): Promise<void> {
    const mappedStatus =
      this.gocardlessStatusMatcherService.matchPaymentAttemptStatus(
        paymentStatus,
      );

    const existingPaymentAttempt =
      await this.prismaService.payByBankPaymentAttempt.findUnique({
        where: {
          providerReference_providerPaymentId: {
            providerReference: billingRequestId,
            providerPaymentId: paymentId,
          },
        },
      });

    if (
      !this.canUpdateStatus(existingPaymentAttempt?.paymentStatus, mappedStatus)
    )
      return;

    const paymentAttempt =
      await this.prismaService.payByBankPaymentAttempt.upsert({
        where: {
          providerReference_providerPaymentId: {
            providerReference: billingRequestId,
            providerPaymentId: paymentId,
          },
        },
        update: {
          paymentStatus: mappedStatus,
        },
        create: {
          payByBankPaymentId: payByBankPaymentId,
          providerReference: billingRequestId,
          providerPaymentId: paymentId,
          paymentStatus: mappedStatus,
        },
      });

    await this.invoicePaymentStatusService.refreshFromPaymentAttempt(
      paymentAttempt.payByBankPaymentId,
      mappedStatus === 'SUCCESS',
    );
    if (mappedStatus === 'PAYMENT_IN_PROGRESS') {
      await this.invoicePaymentStatusService.notifyPaymentSubmittedForPayByBankPayment(
        paymentAttempt.payByBankPaymentId,
      );
    }
  }
}
