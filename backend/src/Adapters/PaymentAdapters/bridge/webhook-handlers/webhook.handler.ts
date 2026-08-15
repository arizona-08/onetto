import { Injectable } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { $Enums, InvoicePaymentLinkSession, Prisma } from "@prisma/client";
import { MailService } from 'src/mail/mail.service';
import { InvoicePaymentFeeService } from 'src/payment-fee/invoice-payment-fee.service';
import { BridgeWebhookLinkStatus, BridgeWebhookTransactionStatus, WebhookTransactionDto } from "./dtos/transaction.dto";
import { BridgeProviderService } from "../bridge-provider.service";
import { BridgeStatusMatcherService } from "../bridge-status-matcher.service";

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
    private readonly mailService: MailService,
    private readonly invoicePaymentFeeService: InvoicePaymentFeeService,
    private readonly bridgeStatusMatcherService: BridgeStatusMatcherService,
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

      await this.prismaService.invoicePaymentAttempt.create({
        data: {
          invoicePaymentLinkSessionId: session?.id,
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
      console.log("webhook update fired", webhookContent);

      const sessionResult = await this.getPaymentSession(webhookContent.payment_link_id);
      if (!sessionResult.ok) {
        console.error(sessionResult.message);
        return;
      }

      const session = sessionResult.session;

      const paidDocument = await this.prismaService.$transaction(async (prisma) => {
        await prisma.invoicePaymentAttempt.upsert({
          where: {
            paymentRequestId: webhookContent.payment_request_id,
            paymentTransactionId: webhookContent.payment_transaction_id,
          },
          update: {
            paymentTransactionStatus: this.bridgeStatusMatcherService.transactionAttemptStatusMatcher(webhookContent.status as BridgeWebhookTransactionStatus),
            paymentTransactionErrorStatusReason: webhookContent.status_reason,
          },
          create: {
            invoicePaymentLinkSessionId: session.id,
            paymentRequestId: webhookContent.payment_request_id,
            paymentTransactionId: webhookContent.payment_transaction_id,
            paymentTransactionStatus: this.bridgeStatusMatcherService.transactionAttemptStatusMatcher(webhookContent.status as BridgeWebhookTransactionStatus),
            paymentTransactionErrorStatusReason: webhookContent.status_reason,
          }
        })

        const existingDocument = await prisma.document.findUnique({
          where: {
            id: session.invoiceId,
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
          console.error(`Document with id ${session.invoiceId} not found.`);
          return null;
        }

        const allDocumentSessionTransactionAttempts = await prisma.invoicePaymentAttempt.findMany({
          where: {
            invoicePaymentLinkSessionId: session.id,
          },

          select: {
            paymentTransactionStatus: true
          }
        });

        if(existingDocument.invoiceStatus === 'PAID_MANUALLY'){
          return;
        }

        if(allDocumentSessionTransactionAttempts.some(attempt => attempt.paymentTransactionStatus === 'SUCCESS')){
          await this.prismaService.invoicePaymentLinkSession.update({
            where: {
              paymentLinkId: webhookContent.payment_link_id
            },
            data: {
              paymentStatus: 'SUCCESS',
            }
          });

          await this.markDocumentAs('PAID', existingDocument.id, prisma);
          await this.invoicePaymentFeeService.createForPaidInvoice(
            existingDocument.id,
            existingDocument.companyId,
            prisma,
          );
          return webhookContent.status === 'ACSC' && existingDocument.invoiceStatus !== 'PAID'
            ? existingDocument
            : null;
        } else if(allDocumentSessionTransactionAttempts.every(attempt => attempt.paymentTransactionStatus === 'FAILED')){
          await this.prismaService.invoicePaymentLinkSession.update({
            where: {
              paymentLinkId: webhookContent.payment_link_id
            },
            data: {
              paymentStatus: 'FAILED',
            }
          });
          await this.markDocumentAs('REJECTED', existingDocument.id, prisma);
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

      await this.prismaService.invoicePaymentLinkSession.update({
        where: {
          paymentLinkId: webhookContent.payment_link_id
        },
        data: {
          linkStatus: this.bridgeStatusMatcherService.linkStatusMatcher(webhookContent.payment_link_status as BridgeWebhookLinkStatus) || 'VALID',
        }
      })
    } catch (error) {
      console.error("Error handling link updated webhook:", error);
      return;
    }
  }

  async getPaymentSession(paymentLinkId: string): Promise<GetPaymentSessionResult> {
    const session = await this.prismaService.invoicePaymentLinkSession.findUnique({
      where: {
        paymentLinkId: paymentLinkId,
      },
    });

    if (!session) {
      console.error(`No session found for payment_link_id: ${paymentLinkId}`);
      return {ok: false, message: `No session found for payment_link_id: ${paymentLinkId}`};
    }

    return {ok: true, session: session};
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
