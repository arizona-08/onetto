import { Injectable } from '@nestjs/common';
import { WebhookHandlerInterface } from '../../Interfaces/WebhookHandler.interface';
import { GoCardlessEventDto } from './dtos/event.dto';
import { GoCardlessStatusMatcherService } from '../gocardless-status-matcher.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { GoCardlessOAuthService } from '../gocardless-oauth.service';
import { $Enums } from '@prisma/client';

@Injectable()
export class GoCardlessBillingRequestWebhookHandler implements WebhookHandlerInterface {
  constructor(
    private readonly gocardlessOAuthService: GoCardlessOAuthService,
    private readonly gocardlessStatusMatcherService: GoCardlessStatusMatcherService,
    private readonly prismaService: PrismaService,
  ) {}

  async handleWebhook(webhook: GoCardlessEventDto): Promise<void> {
    if (!this.isRelevantAction(webhook.action)) {
      return;
    }

    const billingRequestId = webhook.links.billing_request;
    if (!billingRequestId) {
      throw new Error(
        `Billing request missing from webhook event ${webhook.id}`,
      );
    }

    if (webhook.action === 'bank_authorisation_failed' || webhook.action === 'bank_authorisation_denied') {
      await this.markPaymentAsFailed(billingRequestId, webhook);
      return;
    }

    const client = await this.gocardlessOAuthService.getClientForProviderAccount(webhook.organisation_id);
    const billingRequest = await client.billingRequests.find(billingRequestId);
    if (!billingRequest) {
      throw new Error(
        `Billing request with ID ${billingRequestId} not found for provider account ${webhook.organisation_id}`,
      );
    }

    const mappedStatus = this.gocardlessStatusMatcherService.matchLinkStatus(billingRequest.status as string,);

    await this.syncLinkStatus(billingRequestId, mappedStatus);
  }

  isRelevantAction(action: string): boolean {
    const relevantActions = [
      'bank_authorisation_denied',
      'bank_authorisation_failed',
      'fulfilled',
    ];
    return relevantActions.includes(action);
  }

  async syncPayByBankPaymentStatus(
    providerReference: string,
    providerStatus: $Enums.InvoicePaymentStatus
  ){

  }

  async syncLinkStatus(
    billingRequestId: string,
    billingRequestStatus: $Enums.InvoicePaymentLinkStatus,
  ): Promise<void> {
    const invoicePaymentLink =
      await this.prismaService.invoicePaymentLink.findUnique({
        where: {
          providerReference: billingRequestId,
        },
      });

    if (!invoicePaymentLink) {
      throw new Error(
        `No invoice payment link found for billing request ID ${billingRequestId}`,
      );
    }

    await this.prismaService.processedWebhookEvents.create({
      data: {
        provider: 'GOCARDLESS',
        providerEventId: billingRequestId,
      },
    });

    const existingStatus = invoicePaymentLink.linkStatus;

    if (existingStatus === billingRequestStatus) {
      console.log(
        `No status change for billing request ID ${billingRequestId}. Existing status: ${existingStatus}, New status: ${billingRequestStatus}`,
      );
      return;
    }

    const canBeUpdated =
      existingStatus !== 'COMPLETED' &&
      existingStatus !== 'EXPIRED' &&
      existingStatus !== 'REVOKED' &&
      existingStatus !== 'FAILED';

    if (!canBeUpdated) {
      console.log(
        `Cannot update billing request ID ${billingRequestId} from status ${existingStatus} to ${billingRequestStatus}`,
      );
      return;
    }

    await this.prismaService.invoicePaymentLink.update({
      where: {
        id: invoicePaymentLink.id,
      },
      data: {
        linkStatus: billingRequestStatus,
      },
    });
  }

  /**
   * Une autorisation bancaire refusée rend le lien inutilisable. La tentative la
   * plus récente est celle associée au parcours de paiement qui vient d'échouer.
   */
  private async markPaymentAsFailed(
    billingRequestId: string,
    webhook: GoCardlessEventDto,
  ): Promise<void> {
    const payByBankPayment =
      await this.prismaService.payByBankPayment.findUnique({
        where: { providerReference: billingRequestId },
        include: {
          payByBankPaymentAttempts: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: { id: true },
          },
        },
      });

    if (!payByBankPayment) {
      throw new Error(
        `No payment found for billing request ID ${billingRequestId}`,
      );
    }

    const failureReason =
      typeof webhook.details.description === 'string'
        ? webhook.details.description
        : 'Bank authorisation failed';

    await this.prismaService.$transaction(async (prisma) => {
      await prisma.payByBankPayment.update({
        where: { id: payByBankPayment.id },
        data: {
          status: 'FAILED',
        },
      });

      const latestAttempt = payByBankPayment.payByBankPaymentAttempts[0];
      if (latestAttempt) {
        await prisma.payByBankPaymentAttempt.update({
          where: { id: latestAttempt.id },
          data: {
            paymentStatus: 'FAILED',
            failureReason,
          },
        });
      }
    });
  }
}
