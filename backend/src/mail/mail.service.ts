import { MailerService } from '@nestjs-modules/mailer';
import { Injectable } from '@nestjs/common';

type Attachment = {
  filename: string;
  content: Buffer;
  contentType: string;
};

type MailOptions = {
  to: string;
  subject: string;
  text: string;
  html?: string;
  attachments?: Attachment[];
};

type InvoiceMailInput = {
  clientName: string;
  documentNumber: string | null;
  totalPrice: number;
  paymentDueAt: Date;
  companyName: string;
  companyEmail: string;
  paymentLink: string;
};

type EstimateMailInput = {
  clientName: string;
  documentNumber: string | null;
  totalPrice: number;
  paymentDueAt: Date;
  senderName: string;
  documentUrl: string;
};

type PaymentConfirmationMailInput = {
  clientName: string;
  documentNumber: string | null;
  totalPrice: number;
  companyName: string;
  companyEmail: string;
};

type PaymentReceiptMailInput = {
  clientName: string;
  documentNumber: string | null;
  amount: number;
  companyName: string;
  companyEmail: string;
};

const formatAmount = (amount: number) => `${amount.toFixed(2)} €`;
const formatDate = (date: Date) => date.toLocaleDateString('fr-FR');

@Injectable()
export class MailService {
  constructor(private readonly mailerService: MailerService) {}

  async sendMail({ to, subject, text, html, attachments }: MailOptions) {
    await this.mailerService.sendMail({
      to,
      subject,
      text,
      html,
      attachments,
    });
  }

  createInvoiceMail(
    input: InvoiceMailInput,
  ): Pick<MailOptions, 'subject' | 'text' | 'html'> {
    return {
      subject: `Votre facture ${input.documentNumber}`,
      text: this.createInvoiceText(input),
      html: this.createInvoiceTemplate(input),
    };
  }

  createEstimateMail(
    input: EstimateMailInput,
  ): Pick<MailOptions, 'subject' | 'text' | 'html'> {
    return {
      subject: `Votre devis ${input.documentNumber}`,
      text: this.createEstimateText(input),
      html: this.createEstimateTemplate(input),
    };
  }

  createInvoicePaymentRetryMail(
    input: InvoiceMailInput,
  ): Pick<MailOptions, 'subject' | 'text' | 'html'> {
    return {
      subject: `Nouveau lien de paiement — facture ${input.documentNumber}`,
      text: this.createInvoicePaymentRetryText(input),
      html: this.createInvoicePaymentRetryTemplate(input),
    };
  }

  createPaymentConfirmationMail(
    input: PaymentConfirmationMailInput,
  ): Pick<MailOptions, 'subject' | 'text' | 'html'> {
    return {
      subject: `Paiement confirmé — facture ${input.documentNumber}`,
      text: this.createPaymentConfirmationText(input),
      html: this.createPaymentConfirmationTemplate(input),
    };
  }

  createPaymentReceiptMail(
    input: PaymentReceiptMailInput,
  ): Pick<MailOptions, 'subject' | 'text' | 'html'> {
    return {
      subject: `Règlement reçu — facture ${input.documentNumber}`,
      text: [
        `Bonjour ${input.clientName},`,
        '',
        `Nous confirmons la réception de votre règlement de ${formatAmount(input.amount)} pour la facture ${input.documentNumber}.`,
        '',
        'Merci pour votre paiement.',
      ].join('\n'),
      html: this.createPaymentReceiptTemplate(input),
    };
  }

  private createInvoiceText(input: InvoiceMailInput): string {
    return [
      `Bonjour ${input.clientName},`,
      '',
      `Veuillez trouver en pièce jointe votre facture ${input.documentNumber}, émise par ${input.companyName}.`,
      `Montant total : ${formatAmount(input.totalPrice)}`,
      `Date d'échéance : ${formatDate(input.paymentDueAt)}`,
      '',
      'Vous pouvez également payer votre facture en ligne :',
      input.paymentLink,
      '',
      'Merci.',
    ].join('\n');
  }

  private createEstimateText(input: EstimateMailInput): string {
    return [
      `Bonjour ${input.clientName},`,
      '',
      `${input.senderName} vous a envoyé le devis ${input.documentNumber}.`,
      `Montant proposé : ${formatAmount(input.totalPrice)}`,
      `Valable jusqu'au : ${formatDate(input.paymentDueAt)}`,
      '',
      'Consultez le devis et répondez depuis votre espace dédié :',
      input.documentUrl,
      '',
      'Merci.',
    ].join('\n');
  }

  private createInvoicePaymentRetryText(input: InvoiceMailInput): string {
    return [
      `Bonjour ${input.clientName},`,
      '',
      `Le règlement de votre facture ${input.documentNumber} n'a pas pu aboutir.`,
      `Montant total : ${formatAmount(input.totalPrice)}`,
      `Date d'échéance : ${formatDate(input.paymentDueAt)}`,
      '',
      'Un nouveau lien de paiement sécurisé a été généré. Vous pouvez réessayer ici :',
      input.paymentLink,
      '',
      'Merci.',
    ].join('\n');
  }

  private createPaymentConfirmationText(
    input: PaymentConfirmationMailInput,
  ): string {
    return [
      `Bonjour ${input.clientName},`,
      '',
      `Nous vous confirmons la bonne réception du règlement de votre facture ${input.documentNumber}.`,
      `Montant réglé : ${formatAmount(input.totalPrice)}`,
      '',
      'Merci pour votre paiement.',
    ].join('\n');
  }

  private createInvoiceTemplate(input: InvoiceMailInput): string {
    const details = this.createDetailsTable([
      ['Montant total', formatAmount(input.totalPrice)],
      ['Date d’échéance', formatDate(input.paymentDueAt)],
    ]);

    return this.createEmailLayout({
      badge: 'FACTURE',
      title: 'Votre facture est prête',
      greeting: `Bonjour ${input.clientName},`,
      message: `Veuillez trouver en pièce jointe votre facture <strong>${input.documentNumber}</strong>.`,
      details,
      action: { label: 'Payer la facture', url: input.paymentLink },
      footer: `${input.companyName} · ${input.companyEmail}`,
      note: `Pour toute question, vous pouvez contacter ${input.companyName} à ${input.companyEmail}.`,
    });
  }

  private createEstimateTemplate(input: EstimateMailInput): string {
    const details = this.createDetailsTable([
      ['Montant proposé', formatAmount(input.totalPrice)],
      ['Valable jusqu’au', formatDate(input.paymentDueAt)],
    ]);

    return this.createEmailLayout({
      badge: 'DEVIS',
      title: 'Un devis vous attend',
      greeting: `Bonjour ${input.clientName},`,
      message: `${input.senderName} vous a envoyé le devis <strong>${input.documentNumber}</strong>. Consultez-le, puis acceptez-le, refusez-le ou demandez des ajustements depuis votre espace dédié.`,
      details,
      action: { label: 'Consulter le devis', url: input.documentUrl },
      footer: 'Onetto · Votre espace documentaire',
      note: 'Ce lien est personnel et vous permet d’échanger directement au sujet du devis.',
    });
  }

  private createInvoicePaymentRetryTemplate(input: InvoiceMailInput): string {
    const details = this.createDetailsTable([
      ['Montant total', formatAmount(input.totalPrice)],
      ['Date d’échéance', formatDate(input.paymentDueAt)],
    ]);

    return this.createEmailLayout({
      badge: 'PAIEMENT À RÉESSAYER',
      title: 'Un nouveau lien de paiement est disponible',
      greeting: `Bonjour ${input.clientName},`,
      message: `Le règlement de votre facture <strong>${input.documentNumber}</strong> n’a pas pu aboutir. Un nouveau lien de paiement sécurisé a été généré afin de vous permettre de réessayer.`,
      details,
      action: { label: 'Payer la facture', url: input.paymentLink },
      footer: `${input.companyName} · ${input.companyEmail}`,
      note: `Pour toute question, vous pouvez contacter ${input.companyName} à ${input.companyEmail}.`,
    });
  }

  private createPaymentConfirmationTemplate(
    input: PaymentConfirmationMailInput,
  ): string {
    const details = this.createDetailsTable([
      ['Montant réglé', formatAmount(input.totalPrice)],
      ['Statut', 'Paiement confirmé'],
    ]);

    return this.createEmailLayout({
      badge: 'PAIEMENT CONFIRMÉ',
      title: 'Votre paiement a bien été reçu',
      greeting: `Bonjour ${input.clientName},`,
      message: `Nous vous confirmons la bonne réception du règlement de votre facture <strong>${input.documentNumber}</strong>.`,
      details,
      footer: `${input.companyName} · ${input.companyEmail}`,
      note: 'Merci pour votre confiance.',
    });
  }

  private createPaymentReceiptTemplate(input: PaymentReceiptMailInput): string {
    const details = this.createDetailsTable([
      ['Montant reçu', formatAmount(input.amount)],
      ['Statut', 'Règlement reçu'],
    ]);

    return this.createEmailLayout({
      badge: 'RÈGLEMENT REÇU',
      title: 'Votre règlement a bien été reçu',
      greeting: `Bonjour ${input.clientName},`,
      message: `Nous confirmons la réception de votre règlement pour la facture <strong>${input.documentNumber}</strong>.`,
      details,
      footer: `${input.companyName} · ${input.companyEmail}`,
      note: 'Merci pour votre confiance.',
    });
  }

  private createDetailsTable(rows: Array<[string, string]>): string {
    const cells = rows
      .map(([label, value], index) => {
        const bottomPadding = index === rows.length - 1 ? '16px' : '0';
        return `<tr><td style="padding:16px 16px ${bottomPadding};color:#71717a">${label}</td><td style="padding:16px 16px ${bottomPadding};text-align:right;font-weight:700;color:#635bff">${value}</td></tr>`;
      })
      .join('');

    return `<table role="presentation" style="width:100%;margin:24px 0;background:#fafafa;border-radius:10px">${cells}</table>`;
  }

  private createEmailLayout({
    badge,
    title,
    greeting,
    message,
    details,
    action,
    footer,
    note,
  }: {
    badge: string;
    title: string;
    greeting: string;
    message: string;
    details: string;
    action?: { label: string; url: string };
    footer: string;
    note: string;
  }): string {
    return `
      <div style="margin:0;padding:32px 16px;background:#f6f6f8;font-family:Arial,sans-serif;color:#18181b">
        <table role="presentation" style="max-width:600px;margin:auto;background:#fff;border-radius:14px;overflow:hidden;border-collapse:collapse">
          <tr><td style="padding:32px">
            <div style="display:inline-block;padding:7px 11px;border-radius:999px;background:#eeedff;color:#635bff;font-size:12px;font-weight:700">${badge}</div>
            <h1 style="margin:20px 0 8px;font-size:28px;letter-spacing:-.5px">${title}</h1>
            <p style="margin:0;color:#71717a;line-height:1.6">${greeting}</p>
            <p style="margin:20px 0;color:#52525b;line-height:1.6">${message}</p>
            ${details}
            ${action ? `<a href="${action.url}" style="display:inline-block;border-radius:8px;background:#635bff;padding:13px 20px;color:#fff;font-size:14px;font-weight:700;text-decoration:none">${action.label}</a>` : ''}
            <p style="margin:24px 0 0;color:#71717a;font-size:13px;line-height:1.6">${note}</p>
          </td></tr>
          <tr><td style="padding:18px 32px;background:#635bff;color:#fff;font-size:12px">${footer}</td></tr>
        </table>
      </div>`;
  }
}
