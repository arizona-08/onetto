import { MailService } from './mail.service';

const reminderTypes = [
  'ESTIMATE_PENDING',
  'ESTIMATE_PENDING_BEFORE_DUE_DATE',
  'INVOICE_BEFORE_DUE_DATE',
  'INVOICE_OVERDUE_FIRST',
  'INVOICE_OVERDUE_SECOND',
  'INSTALMENT_MANDATE_AFTER_ISSUE',
  'INSTALMENT_MANDATE_BEFORE_AUTHORIZATION_DEADLINE',
  'INSTALMENT_PAYMENT_OVERDUE',
] as const;

describe('MailService templates', () => {
  const service = new MailService({ sendMail: jest.fn() } as never);

  it('génère le bouton de paiement dans le template de facture', () => {
    const mail = service.createInvoiceMail({
      clientName: 'Client',
      documentNumber: '#FACT-2026-0001',
      totalPrice: 120,
      paymentDueAt: new Date('2026-09-01'),
      companyName: 'Onetto',
      companyEmail: 'contact@onetto.test',
      paymentLink: 'https://pay.test/invoice-1',
    });

    expect(mail.html).toContain('Payer la facture');
    expect(mail.html).toContain('https://pay.test/invoice-1');
    expect(mail.text).toContain('https://pay.test/invoice-1');
  });

  it('génère le bouton de négociation dans le template de devis', () => {
    const mail = service.createEstimateMail({
      clientName: 'Client',
      documentNumber: '#DEV-2026-0001',
      totalPrice: 120,
      paymentDueAt: new Date('2026-09-01'),
      senderName: 'Ada Lovelace',
      documentUrl: 'https://onetto.test/negociations?token=secure-token',
    });

    expect(mail.html).toContain('Consulter le devis');
    expect(mail.html).toContain('secure-token');
  });

  it('génère le message de relance et le bouton de paiement', () => {
    const mail = service.createInvoicePaymentRetryMail({
      clientName: 'Client',
      documentNumber: '#FACT-2026-0001',
      totalPrice: 120,
      paymentDueAt: new Date('2026-09-01'),
      companyName: 'Onetto',
      companyEmail: 'contact@onetto.test',
      paymentLink: 'https://pay.test/new-link',
    });

    expect(mail.html).toContain('Un nouveau lien de paiement est disponible');
    expect(mail.html).toContain('https://pay.test/new-link');
    expect(mail.text).toContain("n'a pas pu aboutir");
  });

  it('génère une confirmation de paiement sans bouton de paiement', () => {
    const mail = service.createPaymentConfirmationMail({
      clientName: 'Client',
      documentNumber: '#FACT-2026-0001',
      totalPrice: 120,
      companyName: 'Onetto',
      companyEmail: 'contact@onetto.test',
    });

    expect(mail.subject).toContain('Paiement confirmé');
    expect(mail.html).toContain('Votre paiement a bien été reçu');
    expect(mail.html).not.toContain('Payer la facture');
    expect(mail.text).toContain('Montant réglé : 120.00 €');
  });

  it.each(reminderTypes)('génère le message de relance %s', (type) => {
    const mail = service.createReminderMail(
      {
        clientName: 'Client',
        documentNumber: '#DOC-2026-0001',
        dueAt: new Date('2026-09-01'),
        instalmentNumber: 1,
        instalmentAmount: 50,
      },
      type,
    );

    expect(mail.subject).toBeTruthy();
    expect(mail.text).toContain('#DOC-2026-0001');
    expect(mail.html).toContain('#DOC-2026-0001');
  });

  it('ajoute le bouton de négociation à une relance de devis', () => {
    const mail = service.createReminderMail(
      {
        clientName: 'Client',
        documentNumber: '#DEV-2026-0001',
        dueAt: new Date('2026-09-01'),
        action: {
          label: 'Consulter le devis',
          url: 'https://onetto.test/negociations?token=fresh-token',
        },
      },
      'ESTIMATE_PENDING',
    );

    expect(mail.html).toContain('Consulter le devis');
    expect(mail.html).toContain('fresh-token');
  });
});
