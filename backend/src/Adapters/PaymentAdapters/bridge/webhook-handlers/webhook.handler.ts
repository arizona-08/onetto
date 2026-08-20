import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

import {
  BridgeWebhookLinkStatus,
  BridgeWebhookTransactionStatus,
  WebhookTransactionDto,
} from './dtos/transaction.dto';
import { BridgeStatusMatcherService } from '../bridge-status-matcher.service';
import { InvoicePaymentStatusService } from 'src/invoice-payments/invoice-payment-status.service';
import { PayByBankPayment } from '@prisma/client';

type GetPayByBankPaymentResult =
  | {
      ok: true;
      payByBankPayment: PayByBankPayment;
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

      const payByBankResult = await this.getPayByBankPayment(
        webhookContent.payment_link_id,
      );
      if (!payByBankResult.ok) {
        console.error(payByBankResult.message);
        return;
      }

      const payByBankPayment = payByBankResult.payByBankPayment;

      await this.prismaService.payByBankPaymentAttempt.create({
        data: {
          providerReference: webhookContent.payment_transaction_id,
          providerPaymentId: webhookContent.payment_request_id,
          payByBankPaymentId: payByBankPayment.id,
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

      const payByBankPaymentResult = await this.getPayByBankPayment(
        webhookContent.payment_link_id,
      );
      if (!payByBankPaymentResult.ok) {
        console.error(payByBankPaymentResult.message);
        return;
      }

      const payByBankPayment = payByBankPaymentResult.payByBankPayment;

      const mappedStatus =
        this.bridgeStatusMatcherService.transactionAttemptStatusMatcher(
          webhookContent.status as BridgeWebhookTransactionStatus,
        );
      const existingAttempt =
        await this.prismaService.payByBankPaymentAttempt.findUnique({
          where: {
            providerReference_providerPaymentId: {
              providerReference: webhookContent.payment_transaction_id,
              providerPaymentId: webhookContent.payment_request_id,
            }
          },
          select: { paymentStatus: true },
        });

      await this.prismaService.payByBankPaymentAttempt.upsert({
        where: {
          providerReference_providerPaymentId: {
            providerReference: webhookContent.payment_transaction_id,
            providerPaymentId: webhookContent.payment_request_id,
          },
        },
        update: {
          paymentStatus: mappedStatus,
          failureReason: webhookContent.status_reason,
        },
        create: {
          payByBankPaymentId: payByBankPayment.id,
          providerReference: webhookContent.payment_transaction_id,
          providerPaymentId: webhookContent.payment_request_id,
          paymentStatus: mappedStatus,
          failureReason: webhookContent.status_reason,
        },
      });

      await this.invoicePaymentStatusService.refreshFromPaymentAttempt(
        payByBankPayment.id,
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

      await this.prismaService.invoicePaymentLink.update({
        where: {
          id: webhookContent.payment_link_id,
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

  async getPayByBankPayment(
    paymentLinkId: string,
  ): Promise<GetPayByBankPaymentResult> {
    const payByBankPayment =
      await this.prismaService.payByBankPayment.findUnique({
        where: {
          providerReference: paymentLinkId,
        },
      });

    if (!payByBankPayment) {
      console.error(`No payByBankPayment found for payment_link_id: ${paymentLinkId}`);
      return {
        ok: false,
        message: `No payByBankPayment found for payment_link_id: ${paymentLinkId}`,
      };
    }

    return { ok: true, payByBankPayment: payByBankPayment };
  }
}
