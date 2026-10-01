import Stripe from 'stripe';
import { SubscriptionWebhookService } from './subscription-webhook.service';

describe('SubscriptionWebhookService — mail d’upgrade admin', () => {
  const prisma = {
    processedStripeWebhookEvents: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    adminSubscriptionUpgrade: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
  };
  const mail = {
    createAdminUpgradeSuccessMail: jest.fn(() => ({
      subject: 'Upgrade confirmé',
      text: 'Votre facture est jointe.',
    })),
    sendMail: jest.fn(),
  };
  const service = new SubscriptionWebhookService(
    prisma as never,
    { getOrThrow: () => 'sk_test_example' } as never,
    mail as never,
  );
  const stripe = Reflect.get(service, 'stripe') as Stripe;
  const retrieveInvoice = jest.spyOn(stripe.invoices, 'retrieve');
  const syncSubscription = jest.spyOn(service, 'syncSubscription');
  const fetchPdf = jest.spyOn(global, 'fetch');
  const event = {
    id: 'evt_paid_upgrade',
    type: 'invoice.paid',
    data: {
      object: {
        id: 'in_upgrade',
        billing_reason: 'subscription_update',
        parent: { subscription_details: { subscription: 'sub_123' } },
      },
    },
  };
  const upgrade = {
    id: 'upgrade-1',
    previousPlan: 'STARTER_MONTHLY',
    targetPlan: 'PRO_MONTHLY',
    stripeInvoiceId: 'in_upgrade',
    emailSentAt: null,
    user: { firstname: 'Ada', email: 'ada@example.test' },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.processedStripeWebhookEvents.findUnique.mockResolvedValue(null);
    prisma.adminSubscriptionUpgrade.findUnique.mockResolvedValue(upgrade);
    prisma.adminSubscriptionUpgrade.updateMany.mockResolvedValue({ count: 1 });
    retrieveInvoice.mockResolvedValue({
      id: 'in_upgrade',
      status: 'paid',
      created: 1790899200,
      number: 'INV-2026-10',
      total: 1250,
      currency: 'eur',
      invoice_pdf: 'https://pay.stripe.com/invoice/test/pdf',
    } as Awaited<ReturnType<typeof stripe.invoices.retrieve>>);
    syncSubscription.mockResolvedValue(undefined);
    fetchPdf.mockResolvedValue(
      new Response('%PDF-1.4', {
        status: 200,
        headers: { 'content-type': 'application/pdf' },
      }),
    );
    mail.sendMail.mockResolvedValue(undefined);
  });

  afterAll(() => {
    retrieveInvoice.mockRestore();
    syncSubscription.mockRestore();
    fetchPdf.mockRestore();
  });

  it('envoie la facture PDF après paiement et marque le mail envoyé', async () => {
    await service.handleWebhook(event);

    expect(syncSubscription).toHaveBeenCalledWith('sub_123');
    expect(mail.createAdminUpgradeSuccessMail).toHaveBeenCalledWith({
      firstname: 'Ada',
      previousPlan: 'STARTER_MONTHLY',
      targetPlan: 'PRO_MONTHLY',
      invoiceNumber: 'INV-2026-10',
      totalInCents: 1250,
      currency: 'eur',
      invoicePdfUrl: 'https://pay.stripe.com/invoice/test/pdf',
    });
    const sendCalls = mail.sendMail.mock.calls as Array<
      [
        {
          to: string;
          attachments: Array<{ filename: string; content: Buffer }>;
        },
      ]
    >;
    expect(sendCalls[0][0].to).toBe('ada@example.test');
    expect(sendCalls[0][0].attachments[0].filename).toBe(
      'facture-INV-2026-10.pdf',
    );
    expect(sendCalls[0][0].attachments[0].content.toString()).toBe('%PDF-1.4');
    const updateCalls = prisma.adminSubscriptionUpgrade.update.mock
      .calls as Array<[{ data: { emailSentAt: Date } }]>;
    expect(updateCalls[0][0].data.emailSentAt).toBeInstanceOf(Date);
    expect(prisma.processedStripeWebhookEvents.create).toHaveBeenCalledWith({
      data: { providerEventId: 'evt_paid_upgrade' },
    });
  });

  it('retrouve un upgrade même si le webhook précède l’enregistrement de l’ID de facture', async () => {
    const previousPriceId = process.env.STRIPE_PRO_MONTHLY_PRICE_ID;
    process.env.STRIPE_PRO_MONTHLY_PRICE_ID = 'price_pro_monthly';
    prisma.adminSubscriptionUpgrade.findUnique.mockResolvedValue(null);
    prisma.adminSubscriptionUpgrade.findFirst.mockResolvedValue({
      ...upgrade,
      stripeInvoiceId: null,
    });
    retrieveInvoice.mockResolvedValue({
      id: 'in_upgrade',
      status: 'paid',
      created: 1790899200,
      number: 'INV-2026-10',
      total: 1250,
      currency: 'eur',
      invoice_pdf: 'https://pay.stripe.com/invoice/test/pdf',
      lines: {
        data: [{ pricing: { price_details: { price: 'price_pro_monthly' } } }],
      },
    } as Awaited<ReturnType<typeof stripe.invoices.retrieve>>);

    try {
      await service.handleWebhook(event);
    } finally {
      if (previousPriceId === undefined) {
        delete process.env.STRIPE_PRO_MONTHLY_PRICE_ID;
      } else {
        process.env.STRIPE_PRO_MONTHLY_PRICE_ID = previousPriceId;
      }
    }

    const claimCalls = prisma.adminSubscriptionUpgrade.updateMany.mock
      .calls as Array<[{ data: { stripeInvoiceId: string } }]>;
    expect(claimCalls[0][0].data.stripeInvoiceId).toBe('in_upgrade');
    expect(mail.sendMail).toHaveBeenCalledTimes(1);
  });

  it('n’envoie rien pour une facture sans upgrade administrateur', async () => {
    prisma.adminSubscriptionUpgrade.findUnique.mockResolvedValue(null);
    prisma.adminSubscriptionUpgrade.findFirst.mockResolvedValue(null);

    await service.handleWebhook(event);

    expect(mail.sendMail).not.toHaveBeenCalled();
    expect(prisma.processedStripeWebhookEvents.create).toHaveBeenCalled();
  });

  it('ne renvoie pas un mail déjà expédié', async () => {
    prisma.adminSubscriptionUpgrade.findUnique.mockResolvedValue({
      ...upgrade,
      emailSentAt: new Date(),
    });

    await service.handleWebhook(event);

    expect(mail.sendMail).not.toHaveBeenCalled();
  });

  it('ne lance pas un second envoi simultané', async () => {
    prisma.adminSubscriptionUpgrade.updateMany.mockResolvedValueOnce({
      count: 0,
    });

    await expect(service.handleWebhook(event)).rejects.toThrow(
      'déjà en cours d’envoi',
    );
    expect(mail.sendMail).not.toHaveBeenCalled();
    expect(prisma.processedStripeWebhookEvents.create).not.toHaveBeenCalled();
  });

  it('laisse Stripe réessayer si le téléchargement du PDF échoue', async () => {
    fetchPdf.mockResolvedValue(new Response('', { status: 503 }));

    await expect(service.handleWebhook(event)).rejects.toThrow(
      'Téléchargement de la facture Stripe impossible',
    );
    expect(mail.sendMail).not.toHaveBeenCalled();
    expect(prisma.processedStripeWebhookEvents.create).not.toHaveBeenCalled();
  });
});
