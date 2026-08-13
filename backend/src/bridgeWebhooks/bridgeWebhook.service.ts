import { Injectable } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { WebhookTransactionDto } from "./dtos/transaction.dto";
import { $Enums, BridgePaymentLinkSession, Prisma } from "@prisma/client";
import { MailService } from 'src/mail/mail.service';
import { InvoicePaymentFeeService } from 'src/documents/invoice-payment-fee.service';

type GetPaymentSessionResult =
  | {
      ok: true;
      session: BridgePaymentLinkSession;
    }
  | {
      ok: false;
      message: string;
    };

@Injectable()
export class BridgeWebhookService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly mailService: MailService,
    private readonly invoicePaymentFeeService: InvoicePaymentFeeService,
  ) {}


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

      const sessionResult = await this.getPaymentSession(webhookContent.payment_link_id);
      if (!sessionResult.ok) {
        console.error(sessionResult.message);
        return;
      }

      const session = sessionResult.session;

      await this.prismaService.bridgePaymentAttempt.create({
        data: {
          bridgePaymentLinkSessionId: session?.id,
          paymentRequestId: webhookContent.payment_request_id,
          paymentTransactionId: webhookContent.payment_transaction_id,
        }
      });

    } catch (error) {
      console.error("Error handling transaction created webhook:", error);
      return;
    }
  }

  async handleTransactionUpdated(webhook: WebhookTransactionDto) {
    try {
      const webhookContent = webhook.content;

      const sessionResult = await this.getPaymentSession(webhookContent.payment_link_id);
      if (!sessionResult.ok) {
        console.error(sessionResult.message);
        return;
      }

      const session = sessionResult.session;

      const paidDocument = await this.prismaService.$transaction(async (prisma) => {
        await prisma.bridgePaymentAttempt.upsert({
          where: {
            paymentRequestId: webhookContent.payment_request_id,
            paymentTransactionId: webhookContent.payment_transaction_id,
          },
          update: {
            paymentTransactionStatus: (webhookContent.status as $Enums.BridgePaymentTransactionStatus), // Cast to any to match the enum type
            paymentTransactionStatusReason: webhookContent.status_reason,
          },
          create: {
            bridgePaymentLinkSessionId: session.id,
            paymentRequestId: webhookContent.payment_request_id,
            paymentTransactionId: webhookContent.payment_transaction_id,
            paymentTransactionStatus: (webhookContent.status as $Enums.BridgePaymentTransactionStatus), // Cast to any to match the enum type
            paymentTransactionStatusReason: webhookContent.status_reason,
          }
        })

        const existingDocument = await prisma.document.findUnique({
          where: {
            id: session.documentId,
          },
          include: {
            company: {
              select: {
                name: true,
                email: true,
              },
            },
          },
        });

        if(!existingDocument){
          console.error(`Document with id ${session.documentId} not found.`);
          return null;
        }

        const allDocumentTransactionAttempts = await prisma.bridgePaymentAttempt.findMany({
          where: {
            bridgePaymentLinkSession: {
              documentId: existingDocument.id
            }
          },

          select: {
            paymentTransactionStatus: true
          }
        });

        if(allDocumentTransactionAttempts.some(attempt => attempt.paymentTransactionStatus === 'ACSC')){
          await this.markDocumentAs('PAID', existingDocument.id, prisma);
          await this.invoicePaymentFeeService.createForPaidInvoice(
            existingDocument.id,
            existingDocument.companyId,
            prisma,
          );
          return webhookContent.status === 'ACSC' && existingDocument.invoiceStatus !== 'PAID'
            ? existingDocument
            : null;
        } else if(allDocumentTransactionAttempts.every(attempt => attempt.paymentTransactionStatus === 'RJCT')){
          await this.markDocumentAs('REJECTED', existingDocument.id, prisma);
        } else {
          const nextStatus = this.transactionStatusMatcher(
            webhookContent.status as $Enums.BridgePaymentTransactionStatus,
          );
          await this.markDocumentAs(
            nextStatus,
            existingDocument.id,
            prisma
          );

          if (nextStatus === 'PENDING') {
            await this.invoicePaymentFeeService.resetForPendingInvoice(
              existingDocument.id,
              prisma,
            );
          }
        }
        return null;
      })

      if (paidDocument) {
        await this.sendPaymentConfirmationEmail(paidDocument);
      }
    } catch (error) {
      console.error("Error handling transaction updated webhook:", error);
      return;
    }
  }

  async handleLinkUpdated(webhook: WebhookTransactionDto) {
    try {
      const webhookContent = webhook.content;

      await this.prismaService.bridgePaymentLinkSession.update({
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

  async getPaymentSession(paymentLinkId: string): Promise<GetPaymentSessionResult> {
    const session = await this.prismaService.bridgePaymentLinkSession.findUnique({
      where: {
        bridgePaymentLinkId: paymentLinkId,
      },
    });

    if (!session) {
      console.error(`No session found for payment_link_id: ${paymentLinkId}`);
      return {ok: false, message: `No session found for payment_link_id: ${paymentLinkId}`};
    }

    return {ok: true, session: session};
  }

  transactionStatusMatcher(status: $Enums.BridgePaymentTransactionStatus): $Enums.InvoiceStatus {
    switch (status) {
      case 'CREA':
      case 'ACTC':
        return 'PENDING';
      case 'PDNG':
        return 'PAYMENT_IN_PROGRESS';
      case 'ACSC':
        return 'PAID';
      case 'RJCT':
        return 'REJECTED';
      default:
        return 'PENDING';
    }
  }

  async markDocumentAs(status: $Enums.InvoiceStatus, documentId: string, prisma: Prisma.TransactionClient) {
    await prisma.document.update({
      where: {
        id: documentId
      },
      data: {
        invoiceStatus: status,
      }
    })
  }

  private async sendPaymentConfirmationEmail(document: {
    clientName: string;
    clientEmail: string;
    documentNumber: string | null;
    totalPrice: number;
    company: { name: string; email: string };
  }) {
    const mailContent = this.mailService.createPaymentConfirmationMail({
      clientName: document.clientName,
      documentNumber: document.documentNumber,
      totalPrice: document.totalPrice,
      companyName: document.company.name,
      companyEmail: document.company.email,
    });

    try {
      await this.mailService.sendMail({
        to: document.clientEmail,
        ...mailContent,
      });
    } catch (error) {
      console.error('Unable to send payment confirmation email:', error);
    }
  }
}
