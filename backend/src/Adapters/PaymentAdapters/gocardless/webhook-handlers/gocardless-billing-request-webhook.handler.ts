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

    if (webhook.action === 'bank_authorisation_failed') {
      await this.markPaymentAsFailed(billingRequestId, webhook);
      return;
    }

    const client =
      await this.gocardlessOAuthService.getClientForProviderAccount(
        webhook.organisation_id,
      );
    const billingRequest = await client.billingRequests.find(billingRequestId);
    if (!billingRequest) {
      throw new Error(
        `Billing request with ID ${billingRequestId} not found for provider account ${webhook.organisation_id}`,
      );
    }

    const mappedStatus =
      this.gocardlessStatusMatcherService.matchLinkSessionStatus(
        billingRequest.status as string,
      );

    await this.syncBillingRequestStatus(billingRequestId, mappedStatus);
  }

  isRelevantAction(action: string): boolean {
    const relevantActions = [
      'bank_authorisation_denied',
      'bank_authorisation_failed',
      'fulfilled',
    ];
    return relevantActions.includes(action);
  }

  async syncBillingRequestStatus(
    billingRequestId: string,
    billingRequestStatus: $Enums.InvoicePaymentLinkStatus,
  ): Promise<void> {
    const invoicePaymentLinkSession =
      await this.prismaService.invoicePaymentLinkSession.findUnique({
        where: {
          paymentLinkId: billingRequestId,
        },
      });

    if (!invoicePaymentLinkSession) {
      throw new Error(
        `No invoice payment link session found for billing request ID ${billingRequestId}`,
      );
    }

    await this.prismaService.processedWebhookEvents.create({
      data: {
        provider: 'GOCARDLESS',
        providerEventId: billingRequestId,
      },
    });

    const existingStatus = invoicePaymentLinkSession.linkStatus;

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

    await this.prismaService.invoicePaymentLinkSession.update({
      where: {
        id: invoicePaymentLinkSession.id,
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
    const session =
      await this.prismaService.invoicePaymentLinkSession.findUnique({
        where: { paymentLinkId: billingRequestId },
        include: {
          invoicePaymentAttempts: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: { id: true },
          },
        },
      });

    if (!session) {
      throw new Error(
        `No invoice payment link session found for billing request ID ${billingRequestId}`,
      );
    }

    const failureReason =
      typeof webhook.details.description === 'string'
        ? webhook.details.description
        : 'Bank authorisation failed';

    await this.prismaService.$transaction(async (prisma) => {
      await prisma.invoicePaymentLinkSession.update({
        where: { id: session.id },
        data: {
          linkStatus: 'FAILED',
          paymentStatus: 'FAILED',
        },
      });

      const latestAttempt = session.invoicePaymentAttempts[0];
      if (latestAttempt) {
        await prisma.invoicePaymentAttempt.update({
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
