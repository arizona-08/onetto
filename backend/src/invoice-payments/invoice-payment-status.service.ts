import { Injectable } from '@nestjs/common';
import { $Enums } from '@prisma/client';
import { MailService } from 'src/mail/mail.service';
import { InvoicePaymentFeeService } from 'src/payment-fee/invoice-payment-fee.service';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class InvoicePaymentStatusService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly invoicePaymentFeeService: InvoicePaymentFeeService,
    private readonly mailService: MailService,
  ) {}

  /**
   * Recalcule le statut d'une facture après la mise à jour d'une tentative.
   * Une échéance réglée déclenche un reçu ; la confirmation finale n'est envoyée
   * que lorsque la facture entière est réglée.
   */
  async refreshFromPaymentAttempt(
    invoicePaymentLinkSessionId: string,
    attemptBecameSuccessful: boolean,
  ): Promise<void> {
    const session =
      await this.prismaService.invoicePaymentLinkSession.findUnique({
        where: { id: invoicePaymentLinkSessionId },
        select: { invoiceId: true, invoicePaymentInstallmentId: true },
      });

    if (!session) {
      return;
    }

    if (attemptBecameSuccessful && session.invoicePaymentInstallmentId) {
      await this.prismaService.invoicePaymentInstallment.update({
        where: { id: session.invoicePaymentInstallmentId },
        data: { installmentStatus: 'SUCCESS', paidAt: new Date() },
      });
    }

    const document = await this.prismaService.document.findUnique({
      where: { id: session.invoiceId },
      include: {
        company: { select: { name: true, email: true } },
        invoicePaymentLinkSessions: {
          include: {
            invoicePaymentAttempts: { select: { paymentStatus: true } },
            invoicePaymentInstallment: { select: { amountInCents: true } },
          },
        },
        invoicePaymentPlan: {
          include: {
            invoicePaymentInstallments: {
              include: {
                invoicePaymentLinkSessions: {
                  include: {
                    invoicePaymentAttempts: { select: { paymentStatus: true } },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!document || document.invoiceStatus === 'PAID_MANUALLY') {
      return;
    }

    const paymentSession = document.invoicePaymentLinkSessions.find(
      ({ id }) => id === invoicePaymentLinkSessionId,
    );
    if (paymentSession) {
      await this.prismaService.invoicePaymentLinkSession.update({
        where: { id: paymentSession.id },
        data: {
          paymentStatus: this.getPaymentSessionStatus(
            paymentSession.invoicePaymentAttempts,
          ),
        },
      });
    }

    const nextStatus = this.getInvoiceStatus(document);
    const justPaid = nextStatus === 'PAID' && document.invoiceStatus !== 'PAID';

    if (nextStatus !== document.invoiceStatus) {
      await this.prismaService.document.update({
        where: { id: document.id },
        data: { invoiceStatus: nextStatus },
      });
    }

    if (justPaid) {
      await this.invoicePaymentFeeService.createForPaidInvoice(
        document.id,
        document.companyId,
        this.prismaService,
      );
    }

    if (attemptBecameSuccessful) {
      await this.sendPaymentReceipt(document, invoicePaymentLinkSessionId);
    }

    if (justPaid) {
      await this.sendInvoicePaidConfirmation(document);
    }
  }

  private getInvoiceStatus(document: {
    invoicePaymentLinkSessions: Array<{
      invoicePaymentAttempts: Array<{
        paymentStatus: $Enums.InvoicePaymentAttemptStatus | null;
      }>;
    }>;
    invoicePaymentPlan: {
      invoicePaymentInstallments: Array<{
        invoicePaymentLinkSessions: Array<{
          invoicePaymentAttempts: Array<{
            paymentStatus: $Enums.InvoicePaymentAttemptStatus | null;
          }>;
        }>;
      }>;
    } | null;
  }): $Enums.InvoiceStatus {
    const attempts = document.invoicePaymentLinkSessions.flatMap(
      (paymentSession) => paymentSession.invoicePaymentAttempts,
    );

    if (this.hasInstallmentPlan(document)) {
      const everyInstallmentPaid =
        document.invoicePaymentPlan!.invoicePaymentInstallments.every(
          (installment) =>
            installment.invoicePaymentLinkSessions.some((paymentSession) =>
              paymentSession.invoicePaymentAttempts.some(
                (attempt) => attempt.paymentStatus === 'SUCCESS',
              ),
            ),
        );

      if (everyInstallmentPaid) {
        return 'PAID';
      }

      if (attempts.some((attempt) => attempt.paymentStatus === 'SUCCESS')) {
        return 'PARTIALLY_PAID';
      }
    } else if (
      attempts.some((attempt) => attempt.paymentStatus === 'SUCCESS')
    ) {
      return 'PAID';
    }

    if (
      attempts.some(
        (attempt) => attempt.paymentStatus === 'PAYMENT_IN_PROGRESS',
      )
    ) {
      return 'PAYMENT_IN_PROGRESS';
    }

    if (
      attempts.length > 0 &&
      attempts.every((attempt) => attempt.paymentStatus === 'FAILED')
    ) {
      return 'REJECTED';
    }

    return 'PENDING';
  }

  private hasInstallmentPlan(document: {
    invoicePaymentPlan: { invoicePaymentInstallments: unknown[] } | null;
  }): boolean {
    return (
      (document.invoicePaymentPlan?.invoicePaymentInstallments.length ?? 0) > 0
    );
  }

  private getPaymentSessionStatus(
    attempts: Array<{
      paymentStatus: $Enums.InvoicePaymentAttemptStatus | null;
    }>,
  ): $Enums.InvoicePaymentStatus {
    if (attempts.some((attempt) => attempt.paymentStatus === 'SUCCESS')) {
      return 'SUCCESS';
    }

    if (
      attempts.some(
        (attempt) => attempt.paymentStatus === 'PAYMENT_IN_PROGRESS',
      )
    ) {
      return 'PAYMENT_IN_PROGRESS';
    }

    if (
      attempts.length > 0 &&
      attempts.every((attempt) => attempt.paymentStatus === 'FAILED')
    ) {
      return 'FAILED';
    }

    return 'PENDING';
  }

  private async sendPaymentReceipt(
    document: {
      clientName: string;
      clientEmail: string;
      documentNumber: string | null;
      totalPrice: number;
      company: { name: string; email: string };
      invoicePaymentLinkSessions: Array<{
        id: string;
        invoicePaymentInstallment: { amountInCents: number } | null;
      }>;
    },
    sessionId: string,
  ): Promise<void> {
    const session = document.invoicePaymentLinkSessions.find(
      ({ id }) => id === sessionId,
    );
    const amount = session?.invoicePaymentInstallment
      ? session.invoicePaymentInstallment.amountInCents / 100
      : document.totalPrice;
    const mailContent = this.mailService.createPaymentReceiptMail({
      clientName: document.clientName,
      documentNumber: document.documentNumber,
      amount,
      companyName: document.company.name,
      companyEmail: document.company.email,
    });

    await this.sendMailSafely(
      document.clientEmail,
      mailContent,
      'payment receipt',
    );
  }

  private async sendInvoicePaidConfirmation(document: {
    clientName: string;
    clientEmail: string;
    documentNumber: string | null;
    totalPrice: number;
    company: { name: string; email: string };
  }): Promise<void> {
    const mailContent = this.mailService.createPaymentConfirmationMail({
      clientName: document.clientName,
      documentNumber: document.documentNumber,
      totalPrice: document.totalPrice,
      companyName: document.company.name,
      companyEmail: document.company.email,
    });

    await this.sendMailSafely(
      document.clientEmail,
      mailContent,
      'invoice payment confirmation',
    );
  }

  private async sendMailSafely(
    to: string,
    mailContent: { subject: string; text: string; html?: string },
    context: string,
  ): Promise<void> {
    try {
      await this.mailService.sendMail({ to, ...mailContent });
    } catch (error) {
      console.error(`Unable to send ${context} email:`, error);
    }
  }
}
