import { MailService } from './mail.service';

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
});
