import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { WebhookHandlerInterface } from '../../Interfaces/WebhookHandler.interface';
import { GoCardlessEventDto } from './dtos/event.dto';
import { GoCardlessOAuthService } from '../gocardless-oauth.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { GoCardlessStatusMatcherService } from '../gocardless-status-matcher.service';
import { InvoicePaymentStatusService } from 'src/invoice-payments/invoice-payment-status.service';

@Injectable()
export class GoCardlessPaymentWebhookHandler implements WebhookHandlerInterface {
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

    const billingRequestId = webhookEvent.links.billing_request;
    if (!billingRequestId) {
      throw new InternalServerErrorException(
        `Le webhook de paiement ${webhookEvent.id} ne contient pas de billing_request`,
      );
    }

    const payByBankPayment =
      await this.prismaService.payByBankPayment.findUnique({
        where: { providerReference: billingRequestId },
        select: { id: true },
      });
    if (!payByBankPayment) {
      throw new InternalServerErrorException(
        `Aucun paiement trouvé pour le billing request ${billingRequestId}`,
      );
    }

    const client = await this.gocardlessOAuthService.getClientForProviderAccount(webhookEvent.organisation_id,);
    const payment = await client.payments.find(webhookEvent.links.payment);
    if (!payment) {
      throw new InternalServerErrorException(
        `Paiement avec l'Id ${webhookEvent.links.payment} introuvable pour le compte fournisseur ${webhookEvent.organisation_id}`,
      );
    }

    await this.syncPaymentAttemptStatus(
      billingRequestId,
      payByBankPayment.id,
      payment.id as string,
      payment.status as string,
    );
  }

  isRelevantAction(action: string): boolean {
    const relevantActions = ['created', 'submitted', 'confirmed', 'failed'];

    return relevantActions.includes(action);
  }

  async syncPaymentAttemptStatus(
    billingRequestId: string,
    payByBankPaymentId: string,
    paymentId: string,
    paymentStatus: string,
  ): Promise<void> {
    console.log('webhook payment status', paymentStatus);
    const mappedStatus =
      this.gocardlessStatusMatcherService.matchPaymentAttemptStatus(
        paymentStatus,
      );

    const existingPaymentAttempt =
      await this.prismaService.payByBankPaymentAttempt.findUnique({
        where: {
          providerReference_providerPaymentId: {
            providerReference: billingRequestId,
            providerPaymentId: paymentId
          }
        },
      });

    const existingStatus = existingPaymentAttempt?.paymentStatus;
    if (existingStatus === mappedStatus) {
      return;
    }

    const canBeUpdated =
      existingStatus !== 'SUCCESS' && existingStatus !== 'FAILED';
    if (!canBeUpdated) {
      return;
    }

    if (
      existingStatus === 'PAYMENT_IN_PROGRESS' &&
      mappedStatus === 'PENDING'
    ) {
      return;
    }

    const paymentAttempt =
      await this.prismaService.payByBankPaymentAttempt.upsert({
        where: {
          providerReference_providerPaymentId: {
            providerReference: billingRequestId,
            providerPaymentId: paymentId
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
  }
}
