import { Injectable } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { WebhookTransactionDto } from "./dtos/transaction.dto";
import { $Enums } from "@prisma/client";

@Injectable()
export class BridgeWebhookService {
  constructor(private readonly prismaService: PrismaService) {}


  async handleWebhook(webhook: WebhookTransactionDto) {
    switch (webhook.type){
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
        console.log("Received webhook:", webhook);
        break;
    }
  }

  async handleTransactionCreated(webhook: WebhookTransactionDto) {
    try {
      const webhookContent = webhook.content;
      console.log("webhookContent", webhookContent);

      await this.prismaService.bridgePaymentLink.update({
        where: {
          bridgePaymentLinkId: webhookContent.payment_link_id
        },
        data: {
          paymentRequestId: webhookContent.payment_request_id,
          paymentTransactionId: webhookContent.payment_transaction_id,
        }
      })
    } catch (error) {
      console.error("Error handling transaction created webhook:", error);
      return;
    }
  }

  async handleTransactionUpdated(webhook: WebhookTransactionDto) {
    try {
      const webhookContent = webhook.content;

      await this.prismaService.$transaction(async (prisma) => {
        await prisma.bridgePaymentLink.update({
          where: {
            bridgePaymentLinkId: webhookContent.payment_link_id
          },
          data: {
            paymentRequestId: webhookContent.payment_request_id,
            paymentTransactionId: webhookContent.payment_transaction_id,
            paymentTransactionStatus: (webhookContent.status as $Enums.BridgePaymentTransactionStatus), // Cast to any to match the enum type
          }
        })

        const existingDocument = await prisma.document.findUnique({
          where: {
            id: webhookContent.client_reference
          }
        });

        if(!existingDocument){
          console.error(`Document with id ${webhookContent.client_reference} not found.`);
          return;
        }


        await prisma.document.update({
          where: {
            id: existingDocument.id
          },
          data: {
            invoiceStatus: this.transactionStatusMatcher(webhookContent.status as $Enums.BridgePaymentTransactionStatus),
          }
        })

      })
    } catch (error) {
      console.error("Error handling transaction updated webhook:", error);
      return;
    }
  }

  async handleLinkUpdated(webhook: WebhookTransactionDto) {
    try {
      const webhookContent = webhook.content;

      await this.prismaService.bridgePaymentLink.update({
        where: {
          bridgePaymentLinkId: webhookContent.payment_link_id
        },
        data: {
          linkStatus: (webhookContent.payment_link_status as $Enums.BridgePaymentLinkStatus) || 'VALID',
        }
      })
    } catch (error) {
      console.error("Error handling link updated webhook:", error);
      return;
    }
  }

  transactionStatusMatcher(status: $Enums.BridgePaymentTransactionStatus): $Enums.InvoiceStatus {
    switch (status) {
      case 'CREA':
      case 'ACTC':
      case 'PDNG':
        return 'PENDING';
      case 'ACSC':
        return 'PAID';
      case 'RJCT':
        return 'REJECTED';
      default:
        return 'PENDING';
    }
  }
}