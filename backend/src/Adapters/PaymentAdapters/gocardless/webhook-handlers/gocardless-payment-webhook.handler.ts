import { Injectable, Logger } from '@nestjs/common';
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

    const instalmentScheduleId = (
      payment.links as { instalment_schedule?: string } | undefined
    )?.instalment_schedule;
    if (instalmentScheduleId) {
      const instalment =
        await this.prismaService.invoicePaymentInstalment.findUnique({
          where: { providerPaymentId: paymentId },
          select: {
            id: true,
            amountInCents: true,
            instalmentStatus: true,
            automaticRetryScheduled: true,
            invoiceInstalmentPlan: { select: { invoiceId: true } },
          },
        });
      if (instalment) {
        await this.syncInstalmentStatus(
          instalment,
          payment.status as string,
          webhookEvent.action,
          webhookEvent.details.will_attempt_retry === true,
        );
      } else {
        await this.syncUnmappedInstalmentPayment(
          client,
          instalmentScheduleId,
          paymentId,
          payment.status as string,
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
    if (existingStatus === 'SUCCESS') return false;
    if (nextStatus === 'SUCCESS' || nextStatus === 'PAYMENT_IN_PROGRESS')
      return true;
    return !(
      existingStatus === 'PAYMENT_IN_PROGRESS' && nextStatus === 'PENDING'
    );
  }

  private async syncInstalmentStatus(
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
      invoiceInstalmentPlan: { invoiceId: string };
    },
    paymentStatus: string,
    eventAction?: string,
    willAttemptRetry = false,
  ): Promise<void> {
    const mappedStatus =
      eventAction === 'resubmission_requested'
        ? 'PAYMENT_IN_PROGRESS'
        : this.gocardlessStatusMatcherService.matchPaymentAttemptStatus(
            paymentStatus,
          );
    const automaticRetryScheduled =
      eventAction === 'failed' && willAttemptRetry
        ? true
        : eventAction === 'resubmission_requested'
          ? false
          : instalment.automaticRetryScheduled;
    const canUpdateStatus = this.canUpdateStatus(
      instalment.instalmentStatus,
      mappedStatus,
    );
    if (
      !canUpdateStatus &&
      instalment.automaticRetryScheduled === automaticRetryScheduled
    ) {
      return;
    }

    await this.prismaService.invoicePaymentInstalment.update({
      where: { id: instalment.id },
      data: {
        ...(canUpdateStatus ? { instalmentStatus: mappedStatus } : {}),
        automaticRetryScheduled,
        ...(mappedStatus === 'SUCCESS' ? { paidAt: new Date() } : {}),
      },
    });
    await this.invoicePaymentStatusService.refreshFromInstalment(
      instalment.invoiceInstalmentPlan.invoiceId,
      canUpdateStatus && mappedStatus === 'SUCCESS'
        ? instalment.amountInCents
        : undefined,
    );
    if (canUpdateStatus && mappedStatus === 'PAYMENT_IN_PROGRESS') {
      await this.invoicePaymentStatusService.notifyPaymentSubmittedForInstalment(
        instalment.invoiceInstalmentPlan.invoiceId,
        instalment.amountInCents,
      );
    }
  }

  /**
   * The schedule can be created before GoCardless exposes links.payments. When
   * its payment webhook arrives, fetch the schedule and associate IDs by their
   * documented order in links.payments.
   */
  private async syncUnmappedInstalmentPayment(
    client: Awaited<
      ReturnType<GoCardlessOAuthService['getClientForProviderAccount']>
    >,
    instalmentScheduleId: string,
    paymentId: string,
    paymentStatus: string,
  ): Promise<void> {
    const plan = await this.prismaService.invoiceInstalmentPlan.findFirst({
      where: { providerScheduledId: instalmentScheduleId },
      select: {
        invoiceId: true,
        invoicePaymentInstalments: {
          orderBy: { instalmentNumber: 'asc' },
          select: { id: true, amountInCents: true, instalmentStatus: true },
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
    const paymentIndex = schedule?.links?.payments?.indexOf(paymentId) ?? -1;
    const instalment = plan.invoicePaymentInstalments[paymentIndex];
    if (!instalment) {
      this.logger.warn(
        `Payment ${paymentId} absent des Payments du schedule ${instalmentScheduleId}.`,
      );
      return;
    }

    await this.prismaService.invoicePaymentInstalment.update({
      where: { id: instalment.id },
      data: { providerPaymentId: paymentId },
    });
    await this.syncInstalmentStatus(
      {
        ...instalment,
        automaticRetryScheduled: false,
        invoiceInstalmentPlan: { invoiceId: plan.invoiceId },
      },
      paymentStatus,
    );
  }

  private async syncKnownPaymentAttemptStatus(
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

    await this.prismaService.payByBankPaymentAttempt.update({
      where: { id: attempt.id },
      data: { paymentStatus: mappedStatus },
    });
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
