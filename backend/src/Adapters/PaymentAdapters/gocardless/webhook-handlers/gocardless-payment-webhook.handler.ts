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

    const paymentSession =
      await this.prismaService.invoicePaymentLinkSession.findUnique({
        where: { paymentLinkId: billingRequestId },
        select: { id: true },
      });
    if (!paymentSession) {
      throw new InternalServerErrorException(
        `Aucune session de paiement trouvée pour le billing request ${billingRequestId}`,
      );
    }

    const client =
      await this.gocardlessOAuthService.getClientForProviderAccount(
        webhookEvent.organisation_id,
      );
    const payment = await client.payments.find(webhookEvent.links.payment);
    if (!payment) {
      throw new InternalServerErrorException(
        `Paiement avec l'Id ${webhookEvent.links.payment} introuvable pour le compte fournisseur ${webhookEvent.organisation_id}`,
      );
    }

    await this.syncPaymentStatus(
      paymentSession.id,
      webhookEvent.links.payment_request,
      payment.id as string,
      payment.status as string,
    );
  }

  isRelevantAction(action: string): boolean {
    const relevantActions = ['created', 'submitted', 'confirmed', 'failed'];

    return relevantActions.includes(action);
  }

  async syncPaymentStatus(
    paymentLinkSessionId: string,
    paymentRequestId: string,
    paymentId: string,
    paymentStatus: string,
  ): Promise<void> {
    console.log('webhook payment status', paymentStatus);
    const mappedStatus =
      this.gocardlessStatusMatcherService.matchPaymentAttemptStatus(
        paymentStatus,
      );

    const existingPaymentAttempt =
      await this.prismaService.invoicePaymentAttempt.findUnique({
        where: {
          provider_providerPaymentId: {
            provider: 'GOCARDLESS',
            providerPaymentId: paymentId,
          },
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
      await this.prismaService.invoicePaymentAttempt.upsert({
        where: {
          provider_providerPaymentId: {
            provider: 'GOCARDLESS',
            providerPaymentId: paymentId,
          },
        },
        update: {
          paymentStatus: mappedStatus,
        },
        create: {
          invoicePaymentLinkSessionId: paymentLinkSessionId,
          provider: 'GOCARDLESS',
          providerRequestId: paymentRequestId,
          providerPaymentId: paymentId,
          paymentStatus: mappedStatus,
        },
      });

    await this.invoicePaymentStatusService.refreshFromPaymentAttempt(
      paymentAttempt.invoicePaymentLinkSessionId,
      mappedStatus === 'SUCCESS',
    );
  }
}
