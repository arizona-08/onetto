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

  it.each([
    ['PAYMENT_SUBMITTED', 'PAIEMENT EN COURS'],
    ['PAYMENT_SUCCEEDED', 'RÈGLEMENT REÇU'],
    ['PAYMENT_FAILED', 'PAIEMENT ÉCHOUÉ'],
    ['ESTIMATE_RENEGOTIATED', 'DEVIS À RÉVISER'],
    ['ESTIMATE_REJECTED', 'DEVIS REFUSÉ'],
    ['CONTRACT_MANDATE_ACTIVE', 'MANDAT AUTORISÉ'],
  ] as const)('utilise le template Onetto pour %s', (type, badge) => {
    const previousFrontendUrl = process.env.FRONTEND_URL;
    process.env.FRONTEND_URL = 'https://onetto.test';
    try {
      const mail = service.createAppNotificationMail({
        type,
        title: 'Paiement en cours',
        message: 'Facture <FACT-42> en cours.',
        href: '/documents/42',
      });

      expect(mail.html).toContain(badge);
      expect(mail.html).toContain('Facture &lt;FACT-42&gt; en cours.');
      expect(mail.html).toContain('https://onetto.test/documents/42');
      expect(mail.html).toContain('Onetto · Votre espace documentaire');
      expect(mail.text).toContain('Facture <FACT-42> en cours.');
    } finally {
      if (previousFrontendUrl === undefined) delete process.env.FRONTEND_URL;
      else process.env.FRONTEND_URL = previousFrontendUrl;
    }
  });

  it('présente la fermeture d’entreprise sans lien vers un espace fermé', () => {
    const mail = service.createAppNotificationMail({
      type: 'COMPANY_CLOSED',
      title: 'Espace entreprise fermé',
      message: 'L’entreprise Atelier <test> a été fermée.',
    });

    expect(mail.html).toContain('ESPACE ENTREPRISE FERMÉ');
    expect(mail.html).toContain('Atelier &lt;test&gt;');
    expect(mail.html).not.toContain('<a href=');
  });

  it('utilise le template Onetto pour une nouvelle facture fournisseur', () => {
    const previousFrontendUrl = process.env.FRONTEND_URL;
    process.env.FRONTEND_URL = 'https://onetto.test';
    try {
      const mail = service.createAppNotificationMail({
        type: 'SUPPLIER_INVOICE_RECEIVED',
        title: 'Nouvelle facture fournisseur',
        message: 'ACME <test> vous a envoyé une facture FACT-42.',
        href: '/notifications?view=supplier-invoices',
      });

      expect(mail.subject).toBe('Onetto — Nouvelle facture fournisseur');
      expect(mail.text).toContain(
        'ACME <test> vous a envoyé une facture FACT-42.',
      );
      expect(mail.html).toContain('FACTURE FOURNISSEUR');
      expect(mail.html).toContain('ACME &lt;test&gt;');
      expect(mail.html).toContain('Voir la facture fournisseur');
      expect(mail.html).toContain(
        'https://onetto.test/notifications?view=supplier-invoices',
      );
    } finally {
      if (previousFrontendUrl === undefined) delete process.env.FRONTEND_URL;
      else process.env.FRONTEND_URL = previousFrontendUrl;
    }
  });

  it('reprend le template Onetto pour une invitation Pro avec remise récurrente', () => {
    const mail = service.createAdminUserInvitationMail({
      email: 'ada@example.test',
      plan: 'PRO_YEARLY',
      discountPercent: 40,
      invitationUrl: 'https://onetto.test/auth/register?invitation=jeton',
    });

    expect(mail.subject).toContain('40 %');
    expect(mail.text).toContain('chaque facture');
    expect(mail.html).toContain('Pro — Annuel');
    expect(mail.html).toContain('Créer mon compte');
    expect(mail.html).toContain(
      'https://onetto.test/auth/register?invitation=jeton',
    );
  });

  it('présente Starter avec la remise récurrente', () => {
    const mail = service.createAdminUserInvitationMail({
      email: 'ada@example.test',
      plan: 'STARTER_MONTHLY',
      discountPercent: 15,
      invitationUrl: 'https://onetto.test/auth/register?invitation=jeton',
    });

    expect(mail.subject).toContain('Starter');
    expect(mail.html).toContain('15 %');
    expect(mail.text).toContain('chaque facture');
  });

  it('présente une invitation gratuite sans paiement ni remise', () => {
    const mail = service.createAdminUserInvitationMail({
      email: 'ada@example.test',
      plan: 'FREE',
      discountPercent: 0,
      invitationUrl: 'https://onetto.test/auth/register?invitation=jeton',
    });

    expect(mail.subject).toContain('offre gratuite');
    expect(mail.text).toContain('aucun paiement');
    expect(mail.html).not.toContain('Remise récurrente');
    expect(mail.html).not.toContain('Stripe');
  });

  it('personnalise le lien Checkout sans injecter de HTML utilisateur', () => {
    const mail = service.createAdminCheckoutMail({
      firstname: '<Ada>',
      targetPlan: 'PRO_MONTHLY',
      checkoutUrl: 'https://checkout.stripe.test/session',
    });

    expect(mail.subject).toContain('Pro — Mensuel');
    expect(mail.text).toContain('Bonjour <Ada>');
    expect(mail.html).toContain('Bonjour &lt;Ada&gt;');
    expect(mail.html).toContain('Finaliser mon abonnement');
    expect(mail.html).toContain('https://checkout.stripe.test/session');
  });

  it('annonce la date du downgrade sans demander de paiement', () => {
    const mail = service.createAdminPlanChangeMail({
      firstname: 'Ada',
      targetPlan: 'STARTER_YEARLY',
      effectiveAt: new Date('2026-11-01T00:00:00Z'),
    });

    expect(mail.text).toContain('01/11/2026');
    expect(mail.html).toContain('Starter — Annuel');
    expect(mail.html).not.toContain('Finaliser mon abonnement');
  });

  it('confirme un upgrade avec le montant et le lien PDF Stripe', () => {
    const mail = service.createAdminUpgradeSuccessMail({
      firstname: 'Ada',
      previousPlan: 'STARTER_MONTHLY',
      targetPlan: 'PRO_MONTHLY',
      invoiceNumber: 'INV-2026-10',
      totalInCents: 1250,
      currency: 'eur',
      invoicePdfUrl: 'https://pay.stripe.com/invoice/test/pdf',
    });

    expect(mail.text).toContain('INV-2026-10');
    expect(mail.text).toContain('12,50');
    expect(mail.html).toContain('Télécharger ma facture');
    expect(mail.html).toContain('https://pay.stripe.com/invoice/test/pdf');
  });

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

  it.each([
    ['DEPOSIT', 'Facture d’acompte', 'FACTURE D’ACOMPTE'],
    ['BALANCE', 'Facture finale', 'FACTURE FINALE'],
  ] as const)('utilise le template Onetto pour une %s', (kind, subject, badge) => {
    const mail = service.createContractStageInvoiceMail({
      kind,
      clientName: 'Client',
      documentNumber: '#FACT-2026-0036',
      estimateNumber: '#DEV-2026-0005',
      totalPrice: 291.60,
      paymentDueAt: new Date('2026-12-01'),
      companyName: 'Atelier',
      companyEmail: 'contact@atelier.test',
    });

    expect(mail.subject).toBe(`${subject} #FACT-2026-0036`);
    expect(mail.html).toContain(badge);
    expect(mail.html).toContain('#DEV-2026-0005');
    expect(mail.html).toContain('291.60 €');
    expect(mail.html).toContain('Aucun prélèvement n’est déclenché');
    expect(mail.html).not.toContain('Payer la facture');
    expect(mail.text).toContain('Aucun prélèvement n’est déclenché');
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
