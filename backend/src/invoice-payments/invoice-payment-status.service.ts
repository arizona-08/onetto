import { Injectable } from '@nestjs/common';
import { $Enums } from '@prisma/client';
import { MailService } from 'src/mail/mail.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { SuperPdpEreportingService } from 'src/electronic-invoicing/superpdp-ereporting.service';
import { NotificationsService } from 'src/notifications/notifications.service';

@Injectable()
export class InvoicePaymentStatusService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly mailService: MailService,
    private readonly superPdpEreportingService: SuperPdpEreportingService,
    private readonly notifications: NotificationsService,
  ) {}

  /**
   * Recalcule le statut d'une facture après la mise à jour d'une tentative de
   * paiement par virement. Un reçu est envoyé pour cette tentative réussie ; la
   * confirmation finale n'est envoyée que lorsque la facture entière est réglée.
   */
  async refreshFromPaymentAttempt(
    payByBankPaymentId: string,
    attemptBecameSuccessful: boolean,
  ): Promise<void> {
    const payByBankPayment =
      await this.prismaService.payByBankPayment.findUnique({
        where: { id: payByBankPaymentId },
        select: { invoiceId: true },
      });

    if (!payByBankPayment) {
      return;
    }

    const document = await this.prismaService.document.findUnique({
      where: { id: payByBankPayment.invoiceId },
      select: { id: true, invoiceStatus: true },
    });

    if (!document || document.invoiceStatus === 'PAID_MANUALLY') {
      return;
    }

    const paymentStatus =
      await this.getPayByBankPaymentStatus(payByBankPaymentId);
    await this.prismaService.payByBankPayment.update({
      where: { id: payByBankPaymentId },
      data: { status: paymentStatus },
    });

    const nextStatus = await this.getInvoiceStatus(document.id);
    const justPaid = nextStatus === 'PAID' && document.invoiceStatus !== 'PAID';

    if (nextStatus !== document.invoiceStatus) {
      await this.prismaService.document.update({
        where: { id: document.id },
        data: { invoiceStatus: nextStatus },
      });
    }

    if (attemptBecameSuccessful) {
      await this.sendPaymentReceipt(document.id);
      await this.superPdpEreportingService.syncCollectedPaymentsForInvoice(document.id);
    }

    if (justPaid) {
      await this.sendInvoicePaidConfirmation(document.id);
      await this.notifyPayment(document.id, 'PAYMENT_SUCCEEDED', 'Règlement reçu', 'Le règlement de la facture a été confirmé.', 'confirmed');
    }
  }

  /** Recalculates the invoice status when one of its instalments changes. */
  async refreshFromInstalment(
    invoiceId: string,
    paidInstalmentAmountInCents?: number,
  ): Promise<void> {
    const document = await this.prismaService.document.findUnique({
      where: { id: invoiceId },
      select: { id: true, invoiceStatus: true },
    });

    if (!document || document.invoiceStatus === 'PAID_MANUALLY') return;

    const nextStatus = await this.getInvoiceStatus(document.id);
    const justPaid = nextStatus === 'PAID' && document.invoiceStatus !== 'PAID';
    if (nextStatus !== document.invoiceStatus) {
      await this.prismaService.document.update({
        where: { id: document.id },
        data: { invoiceStatus: nextStatus },
      });
    }
    if (paidInstalmentAmountInCents !== undefined) {
      await this.sendPaymentReceipt(
        document.id,
        paidInstalmentAmountInCents / 100,
      );
      await this.superPdpEreportingService.syncCollectedPaymentsForInvoice(document.id);
    }
    if (justPaid) {
      await this.sendInvoicePaidConfirmation(document.id);
      await this.notifyPayment(document.id, 'PAYMENT_SUCCEEDED', 'Règlement reçu', 'Le règlement de la facture a été confirmé.', 'confirmed');
    }
  }

  async notifyPaymentSubmittedForPayByBankPayment(
    payByBankPaymentId: string,
  ): Promise<void> {
    const payment = await this.prismaService.payByBankPayment.findUnique({
      where: { id: payByBankPaymentId },
      select: { invoiceId: true, amountInCents: true },
    });
    if (!payment) return;
    await this.sendPaymentSubmitted(payment.invoiceId, payment.amountInCents / 100);
    await this.notifyPayment(payment.invoiceId, 'PAYMENT_SUBMITTED', 'Paiement en cours', 'Le paiement de la facture a été soumis à la banque.', 'submitted');
  }

  async notifyPaymentSubmittedForInstalment(
    invoiceId: string,
    amountInCents: number,
  ): Promise<void> {
    await this.sendPaymentSubmitted(invoiceId, amountInCents / 100);
    await this.notifyPayment(invoiceId, 'PAYMENT_SUBMITTED', 'Paiement en cours', 'Le paiement de la facture a été soumis à la banque.', 'submitted');
  }

  private async getInvoiceStatus(
    documentId: string,
  ): Promise<$Enums.InvoiceStatus> {
    const document = await this.prismaService.document.findUniqueOrThrow({
      where: { id: documentId },
      select: {
        payByBankPayments: {
          select: { status: true },
        },
        invoiceInstalmentPlan: {
          select: {
            invoicePaymentInstalments: {
              select: { instalmentStatus: true },
            },
          },
        },
      },
    });

    const instalments =
      document.invoiceInstalmentPlan?.invoicePaymentInstalments ?? [];

    if (instalments.length > 0) {
      if (
        instalments.every(
          (instalment) => instalment.instalmentStatus === 'SUCCESS',
        )
      ) {
        return 'PAID';
      }

      if (
        instalments.some(
          (instalment) => instalment.instalmentStatus === 'SUCCESS',
        )
      ) {
        return 'PARTIALLY_PAID';
      }

      if (
        instalments.some(
          (instalment) => instalment.instalmentStatus === 'PAYMENT_IN_PROGRESS',
        )
      ) {
        return 'PAYMENT_IN_PROGRESS';
      }

      if (
        instalments.every(
          (instalment) => instalment.instalmentStatus === 'FAILED',
        )
      ) {
        return 'REJECTED';
      }

      return 'PENDING';
    }

    const paymentStatuses = document.payByBankPayments.map(
      (payment) => payment.status,
    );

    if (paymentStatuses.some((status) => status === 'SUCCESS')) {
      return 'PAID';
    }

    if (paymentStatuses.some((status) => status === 'PAYMENT_IN_PROGRESS')) {
      return 'PAYMENT_IN_PROGRESS';
    }

    if (
      paymentStatuses.length > 0 &&
      paymentStatuses.every((status) => status === 'FAILED')
    ) {
      return 'REJECTED';
    }

    return 'PENDING';
  }

  private async getPayByBankPaymentStatus(
    payByBankPaymentId: string,
  ): Promise<$Enums.InvoicePaymentStatus> {
    const payment = await this.prismaService.payByBankPayment.findUniqueOrThrow(
      {
        where: { id: payByBankPaymentId },
        select: {
          payByBankPaymentAttempts: { select: { paymentStatus: true } },
        },
      },
    );
    const attempts = payment.payByBankPaymentAttempts;

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
    documentId: string,
    amount?: number,
  ): Promise<void> {
    const document = await this.prismaService.document.findUniqueOrThrow({
      where: { id: documentId },
      select: {
        clientName: true,
        clientEmail: true,
        documentNumber: true,
        totalPrice: true,
        company: { select: { name: true, email: true } },
      },
    });
    const mailContent = this.mailService.createPaymentReceiptMail({
      clientName: document.clientName,
      documentNumber: document.documentNumber,
      amount: amount ?? document.totalPrice,
      companyName: document.company.name,
      companyEmail: document.company.email,
    });

    await this.sendMailSafely(
      document.clientEmail,
      mailContent,
      'payment receipt',
    );
  }

  private async sendPaymentSubmitted(
    documentId: string,
    amount: number,
  ): Promise<void> {
    const document = await this.prismaService.document.findUniqueOrThrow({
      where: { id: documentId },
      select: {
        clientName: true,
        clientEmail: true,
        documentNumber: true,
        company: { select: { name: true, email: true } },
      },
    });
    const mailContent = this.mailService.createPaymentSubmittedMail({
      clientName: document.clientName,
      documentNumber: document.documentNumber,
      amount,
      companyName: document.company.name,
      companyEmail: document.company.email,
    });
    await this.sendMailSafely(document.clientEmail, mailContent, 'payment submitted');
  }

  private async sendInvoicePaidConfirmation(documentId: string): Promise<void> {
    const document = await this.prismaService.document.findUniqueOrThrow({
      where: { id: documentId },
      select: {
        clientName: true,
        clientEmail: true,
        documentNumber: true,
        totalPrice: true,
        company: { select: { name: true, email: true } },
      },
    });
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

  private async notifyPayment(documentId: string, type: 'PAYMENT_SUBMITTED' | 'PAYMENT_SUCCEEDED', title: string, message: string, key: string): Promise<void> {
    const document = await this.prismaService.document.findUnique({ where: { id: documentId }, select: { companyId: true, documentNumber: true } });
    if (!document) return;
    await this.notifications.notifyCompany({ companyId: document.companyId, type, title, message: `${message} (${document.documentNumber})`, href: `/documents/${documentId}`, deduplicationKey: `payment:${documentId}:${key}` });
  }
}
