import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { InvoicePaymentLinkSession } from '@prisma/client';
import {
  BridgeWebhookLinkStatus,
  BridgeWebhookTransactionStatus,
  WebhookTransactionDto,
} from './dtos/transaction.dto';
import { BridgeStatusMatcherService } from '../bridge-status-matcher.service';
import { InvoicePaymentStatusService } from 'src/invoice-payments/invoice-payment-status.service';

type GetPaymentSessionResult =
  | {
      ok: true;
      session: InvoicePaymentLinkSession;
    }
  | {
      ok: false;
      message: string;
    };

@Injectable()
export class BridgeWebhookHandler {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly bridgeStatusMatcherService: BridgeStatusMatcherService,
    private readonly invoicePaymentStatusService: InvoicePaymentStatusService,
  ) {}

  async handleWebhook(webhook: WebhookTransactionDto) {
    switch (webhook.type) {
      case 'payment.transaction.created':
      case 'TEST_EVENT':
        await this.handleTransactionCreated(webhook);
        break;
      case 'payment.transaction.updated':
        await this.handleTransactionUpdated(webhook);
        break;
      case 'payment.link.updated':
        await this.handleLinkUpdated(webhook);
        break;
      default:
        console.log('Received webhook:', webhook);
        break;
    }
  }

  async handleTransactionCreated(webhook: WebhookTransactionDto) {
    try {
      const webhookContent = webhook.content;
      console.log('webhookContent', webhookContent);

      const sessionResult = await this.getPaymentSession(
        webhookContent.payment_link_id,
      );
      if (!sessionResult.ok) {
        console.error(sessionResult.message);
        return;
      }

      const session = sessionResult.session;

      await this.prismaService.invoicePaymentAttempt.create({
        data: {
          invoicePaymentLinkSessionId: session?.id,
          providerRequestId: webhookContent.payment_request_id,
          providerPaymentId: webhookContent.payment_transaction_id,
        },
      });
    } catch (error) {
      console.error('Error handling transaction created webhook:', error);
      return;
    }
  }

  async handleTransactionUpdated(webhook: WebhookTransactionDto) {
    try {
      const webhookContent = webhook.content;
      console.log('webhook update fired', webhookContent);

      const sessionResult = await this.getPaymentSession(
        webhookContent.payment_link_id,
      );
      if (!sessionResult.ok) {
        console.error(sessionResult.message);
        return;
      }

      const session = sessionResult.session;

      const mappedStatus =
        this.bridgeStatusMatcherService.transactionAttemptStatusMatcher(
          webhookContent.status as BridgeWebhookTransactionStatus,
        );
      const existingAttempt =
        await this.prismaService.invoicePaymentAttempt.findUnique({
          where: {
            provider_providerPaymentId: {
              provider: 'BRIDGE',
              providerPaymentId: webhookContent.payment_transaction_id,
            },
          },
          select: { paymentStatus: true },
        });

      await this.prismaService.invoicePaymentAttempt.upsert({
        where: {
          provider_providerPaymentId: {
            provider: 'BRIDGE',
            providerPaymentId: webhookContent.payment_transaction_id,
          },
        },
        update: {
          paymentStatus: mappedStatus,
          failureReason: webhookContent.status_reason,
        },
        create: {
          invoicePaymentLinkSessionId: session.id,
          providerRequestId: webhookContent.payment_request_id,
          providerPaymentId: webhookContent.payment_transaction_id,
          paymentStatus: mappedStatus,
          failureReason: webhookContent.status_reason,
        },
      });

      await this.invoicePaymentStatusService.refreshFromPaymentAttempt(
        session.id,
        mappedStatus === 'SUCCESS' &&
          existingAttempt?.paymentStatus !== 'SUCCESS',
      );
    } catch (error) {
      console.error('Error handling transaction updated webhook:', error);
      return;
    }
  }

  async handleLinkUpdated(webhook: WebhookTransactionDto) {
    try {
      const webhookContent = webhook.content;

      await this.prismaService.invoicePaymentLinkSession.update({
        where: {
          paymentLinkId: webhookContent.payment_link_id,
        },
        data: {
          linkStatus:
            this.bridgeStatusMatcherService.linkStatusMatcher(
              webhookContent.payment_link_status as BridgeWebhookLinkStatus,
            ) || 'VALID',
        },
      });
    } catch (error) {
      console.error('Error handling link updated webhook:', error);
      return;
    }
  }

  async getPaymentSession(
    paymentLinkId: string,
  ): Promise<GetPaymentSessionResult> {
    const session =
      await this.prismaService.invoicePaymentLinkSession.findUnique({
        where: {
          paymentLinkId: paymentLinkId,
        },
      });

    if (!session) {
      console.error(`No session found for payment_link_id: ${paymentLinkId}`);
      return {
        ok: false,
        message: `No session found for payment_link_id: ${paymentLinkId}`,
      };
    }

    return { ok: true, session: session };
  }
}
