/* eslint-disable @typescript-eslint/no-unsafe-assignment -- Jest matchers are dynamically typed. */
jest.mock('../gocardless-oauth.service', () => ({
  GoCardlessOAuthService: class GoCardlessOAuthService {},
}));

import { GoCardlessPaymentWebhookHandler } from './gocardless-payment-webhook.handler';

const event = {
  id: 'EV1',
  action: 'confirmed',
  organisation_id: 'OR1',
  links: { payment: 'PM1' },
  created_at: '2026-08-21T12:00:00.000Z',
  resource_type: 'payments',
  details: {},
  metadata: {},
  resource_metadata: {},
};

describe('GoCardlessPaymentWebhookHandler', () => {
  const client = {
    payments: { find: jest.fn() },
    instalmentSchedules: { find: jest.fn() },
  };
  const oauth = {
    getClientForProviderAccount: jest.fn().mockResolvedValue(client),
  };
  const matcher = {
    matchPaymentAttemptStatus: jest.fn().mockReturnValue('SUCCESS'),
  };
  const prisma = {
    contractStagePayment: { findFirst: jest.fn(), update: jest.fn() },
    companyPaymentAccount: { findFirst: jest.fn() },
    document: { update: jest.fn() },
    $transaction: jest.fn(),
    invoiceInstalmentPlan: { findFirst: jest.fn() },
    invoicePaymentInstalment: {
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    payByBankPaymentAttempt: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      upsert: jest.fn(),
    },
    payByBankPayment: { findUnique: jest.fn() },
  };
  const invoiceStatus = {
    syncContractPaymentResult: jest.fn(),
    refreshFromInstalment: jest.fn(),
    refreshFromPaymentAttempt: jest.fn(),
    notifyPaymentSubmittedForInstalment: jest.fn(),
    notifyPaymentSubmittedForPayByBankPayment: jest.fn(),
  };
  let handler: GoCardlessPaymentWebhookHandler;

  beforeEach(() => {
    jest.resetAllMocks();
    oauth.getClientForProviderAccount.mockResolvedValue(client);
    client.payments.find.mockResolvedValue({
      id: 'PM1',
      status: 'confirmed',
      links: {},
    });
    matcher.matchPaymentAttemptStatus.mockReturnValue('SUCCESS');
    prisma.contractStagePayment.findFirst.mockResolvedValue(null);
    prisma.$transaction.mockImplementation(async (work: (tx: unknown) => Promise<unknown>) => work(prisma));
    prisma.invoicePaymentInstalment.updateMany.mockResolvedValue({ count: 1 });
    prisma.payByBankPaymentAttempt.updateMany.mockResolvedValue({ count: 1 });
    handler = new GoCardlessPaymentWebhookHandler(
      oauth as never,
      matcher as never,
      prisma as never,
      invoiceStatus as never,
    );
  });

  it('synchronise un Payment Pay by Bank déjà associé à une tentative', async () => {
    prisma.payByBankPaymentAttempt.findFirst.mockResolvedValue({
      id: 'attempt-1',
      payByBankPaymentId: 'pbb-1',
      paymentStatus: 'PENDING',
    });

    await handler.handleWebhook(event);

    expect(prisma.payByBankPaymentAttempt.updateMany).toHaveBeenCalledWith({
      where: { id: 'attempt-1', paymentStatus: 'PENDING' },
      data: { paymentStatus: 'SUCCESS' },
    });
    expect(invoiceStatus.refreshFromPaymentAttempt).toHaveBeenCalledWith(
      'pbb-1',
      true,
    );
  });

  it('met à jour le paiement et la facture d’un acompte confirmé', async () => {
    client.payments.find.mockResolvedValue({
      id: 'PM1', status: 'confirmed', amount: '3000', charge_date: '2026-11-20',
      links: { mandate: 'MD1' }, metadata: { contract_stage_id: 'stage-1' },
    });
    prisma.contractStagePayment.findFirst.mockResolvedValue({
      id: 'stage-payment-1', amountInCents: 3000, providerPaymentId: 'PM1',
      stage: {
        invoice: { id: 'invoice-1' },
        plan: { providerMandateId: 'MD1', estimate: { companyId: 'company-1' } },
      },
    });
    prisma.companyPaymentAccount.findFirst.mockResolvedValue({ id: 'account-1' });
    await handler.handleWebhook(event);
    expect(prisma.contractStagePayment.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'stage-payment-1' },
      data: expect.objectContaining({ status: 'SUCCESS' }),
    }));
    expect(prisma.document.update).toHaveBeenCalledWith({ where: { id: 'invoice-1' }, data: { invoiceStatus: 'PAID' } });
  });

  it('n’envoie pas deux reçus si une autre synchronisation a déjà gagné', async () => {
    prisma.payByBankPaymentAttempt.findFirst.mockResolvedValue({
      id: 'attempt-1',
      payByBankPaymentId: 'pbb-1',
      paymentStatus: 'PENDING',
    });
    prisma.payByBankPaymentAttempt.updateMany.mockResolvedValue({ count: 0 });

    await handler.handleWebhook(event);

    expect(invoiceStatus.refreshFromPaymentAttempt).not.toHaveBeenCalled();
  });

  it('notifie le client lorsque le prélèvement est soumis à sa banque', async () => {
    client.payments.find.mockResolvedValue({
      id: 'PM1',
      status: 'submitted',
      links: {},
    });
    matcher.matchPaymentAttemptStatus.mockReturnValue('PAYMENT_IN_PROGRESS');
    prisma.payByBankPaymentAttempt.findFirst.mockResolvedValue({
      id: 'attempt-1',
      payByBankPaymentId: 'pbb-1',
      paymentStatus: 'PENDING',
    });

    await handler.handleWebhook({ ...event, action: 'submitted' });

    expect(
      invoiceStatus.notifyPaymentSubmittedForPayByBankPayment,
    ).toHaveBeenCalledWith('pbb-1');
  });

  it('route un Payment associé à une échéance sans chercher un Pay by Bank', async () => {
    client.payments.find.mockResolvedValue({
      id: 'PM1',
      status: 'confirmed',
      links: { instalment_schedule: 'IS1' },
    });
    prisma.invoicePaymentInstalment.findUnique.mockResolvedValue({
      id: 'instalment-1',
      amountInCents: 5000,
      instalmentStatus: 'PENDING',
      invoiceInstalmentPlan: { invoiceId: 'invoice-1' },
    });

    await handler.handleWebhook(event);

    expect(prisma.invoicePaymentInstalment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: 'instalment-1' }),
      }),
    );
    expect(invoiceStatus.refreshFromInstalment).toHaveBeenCalledWith(
      'invoice-1',
      5000,
    );
    expect(prisma.payByBankPaymentAttempt.findFirst).not.toHaveBeenCalled();
  });

  it('refuse de synchroniser un Payment lié à un autre échéancier', async () => {
    client.payments.find.mockResolvedValue({
      id: 'PM1',
      status: 'confirmed',
      links: { instalment_schedule: 'IS1' },
    });
    prisma.invoicePaymentInstalment.findUnique.mockResolvedValue({
      id: 'instalment-1',
      invoiceInstalmentPlan: {
        invoiceId: 'invoice-1',
        providerScheduledId: 'IS2',
      },
    });
    await expect(handler.handleWebhook(event)).rejects.toThrow(
      'autre échéancier',
    );
    expect(prisma.invoicePaymentInstalment.update).not.toHaveBeenCalled();
  });

  it('ignore sans erreur un Payment qui ne correspond à aucune ressource Onetto', async () => {
    prisma.payByBankPaymentAttempt.findFirst.mockResolvedValue(null);
    prisma.payByBankPayment.findUnique.mockResolvedValue(null);

    await expect(handler.handleWebhook(event)).resolves.toBeUndefined();
    expect(prisma.payByBankPaymentAttempt.upsert).not.toHaveBeenCalled();
  });

  it('est idempotent et ne régresse pas un statut terminal sur un événement tardif', async () => {
    client.payments.find.mockResolvedValue({
      id: 'PM1',
      status: 'created',
      links: { instalment_schedule: 'IS1' },
    });
    prisma.invoicePaymentInstalment.findUnique.mockResolvedValue({
      id: 'instalment-1',
      amountInCents: 5000,
      instalmentStatus: 'SUCCESS',
      automaticRetryScheduled: false,
      manualRetryRequestedAt: null,
      lastProviderEventAt: new Date('2026-08-22T12:00:00.000Z'),
      invoiceInstalmentPlan: { invoiceId: 'invoice-1' },
    });
    matcher.matchPaymentAttemptStatus.mockReturnValue('PENDING');

    await handler.handleWebhook({ ...event, id: 'EV-late', action: 'created' });
    await handler.handleWebhook({
      ...event,
      id: 'EV-duplicate',
      action: 'created',
    });

    expect(prisma.invoicePaymentInstalment.update).not.toHaveBeenCalled();
    expect(invoiceStatus.refreshFromInstalment).toHaveBeenCalledTimes(2);
  });

  it('conserve le retry automatique GoCardless sans exposer un nouveau Payment', async () => {
    client.payments.find.mockResolvedValue({
      id: 'PM1',
      status: 'failed',
      links: { instalment_schedule: 'IS1' },
    });
    matcher.matchPaymentAttemptStatus.mockReturnValue('FAILED');
    prisma.invoicePaymentInstalment.findUnique.mockResolvedValue({
      id: 'instalment-1',
      amountInCents: 5000,
      instalmentStatus: 'PENDING',
      automaticRetryScheduled: false,
      manualRetryRequestedAt: null,
      lastProviderEventAt: null,
      invoiceInstalmentPlan: { invoiceId: 'invoice-1' },
    });

    await handler.handleWebhook({
      ...event,
      id: 'EV-auto-retry',
      action: 'failed',
      details: { will_attempt_retry: true },
    });

    expect(prisma.invoicePaymentInstalment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: 'instalment-1' }),
        data: expect.objectContaining({
          instalmentStatus: 'FAILED',
          automaticRetryScheduled: true,
        }),
      }),
    );
  });

  it('remet une échéance en cours lors de resubmission_requested', async () => {
    client.payments.find.mockResolvedValue({
      id: 'PM1',
      status: 'pending_submission',
      links: { instalment_schedule: 'IS1' },
    });
    prisma.invoicePaymentInstalment.findUnique.mockResolvedValue({
      id: 'instalment-1',
      amountInCents: 5000,
      instalmentStatus: 'FAILED',
      automaticRetryScheduled: true,
      manualRetryRequestedAt: new Date('2026-08-21T11:00:00.000Z'),
      lastProviderEventAt: null,
      invoiceInstalmentPlan: { invoiceId: 'invoice-1' },
    });

    await handler.handleWebhook({
      ...event,
      id: 'EV-resubmission',
      action: 'resubmission_requested',
    });

    expect(prisma.invoicePaymentInstalment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: 'instalment-1' }),
        data: expect.objectContaining({
          instalmentStatus: 'PAYMENT_IN_PROGRESS',
          automaticRetryScheduled: false,
          manualRetryRequestedAt: null,
        }),
      }),
    );
  });

  it('confirme une échéance après resoumission sans compter deux fois un doublon', async () => {
    client.payments.find.mockResolvedValue({
      id: 'PM1',
      status: 'confirmed',
      links: { instalment_schedule: 'IS1' },
    });
    prisma.invoicePaymentInstalment.findUnique
      .mockResolvedValueOnce({
        id: 'instalment-1',
        amountInCents: 5000,
        instalmentStatus: 'PAYMENT_IN_PROGRESS',
        automaticRetryScheduled: false,
        manualRetryRequestedAt: new Date('2026-08-21T11:00:00.000Z'),
        lastProviderEventAt: null,
        invoiceInstalmentPlan: { invoiceId: 'invoice-1' },
      })
      .mockResolvedValueOnce({
        id: 'instalment-1',
        amountInCents: 5000,
        instalmentStatus: 'SUCCESS',
        automaticRetryScheduled: false,
        manualRetryRequestedAt: null,
        lastProviderEventAt: new Date(event.created_at),
        invoiceInstalmentPlan: { invoiceId: 'invoice-1' },
      });
    matcher.matchPaymentAttemptStatus.mockReturnValue('SUCCESS');

    await handler.handleWebhook(event);
    await handler.handleWebhook({ ...event, id: 'EV-duplicate' });

    expect(invoiceStatus.refreshFromInstalment).toHaveBeenCalledTimes(2);
    expect(invoiceStatus.refreshFromInstalment).toHaveBeenCalledWith(
      'invoice-1',
      5000,
    );
  });

  it('rend à nouveau éligible une échéance échouée après resoumission', async () => {
    client.payments.find.mockResolvedValue({
      id: 'PM1',
      status: 'failed',
      links: { instalment_schedule: 'IS1' },
    });
    prisma.invoicePaymentInstalment.findUnique.mockResolvedValue({
      id: 'instalment-1',
      amountInCents: 5000,
      instalmentStatus: 'PAYMENT_IN_PROGRESS',
      automaticRetryScheduled: true,
      manualRetryRequestedAt: new Date('2026-08-21T11:00:00.000Z'),
      lastProviderEventAt: null,
      invoiceInstalmentPlan: { invoiceId: 'invoice-1' },
    });
    matcher.matchPaymentAttemptStatus.mockReturnValue('FAILED');

    await handler.handleWebhook({
      ...event,
      action: 'failed',
      details: { will_attempt_retry: false },
    });

    expect(prisma.invoicePaymentInstalment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          instalmentStatus: 'FAILED',
          automaticRetryScheduled: false,
          manualRetryRequestedAt: null,
        }),
      }),
    );
  });

  it('révoque le paiement acquis lors d’un échec tardif ou d’un chargeback', async () => {
    client.payments.find.mockResolvedValue({
      id: 'PM1',
      status: 'charged_back',
      links: { instalment_schedule: 'IS1' },
    });
    prisma.invoicePaymentInstalment.findUnique.mockResolvedValue({
      id: 'instalment-1',
      amountInCents: 5000,
      instalmentStatus: 'SUCCESS',
      automaticRetryScheduled: false,
      manualRetryRequestedAt: null,
      lastProviderEventAt: null,
      invoiceInstalmentPlan: { invoiceId: 'invoice-1' },
    });
    matcher.matchPaymentAttemptStatus.mockReturnValue('FAILED');

    await handler.handleWebhook({ ...event, action: 'charged_back' });

    expect(prisma.invoicePaymentInstalment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          instalmentStatus: 'FAILED',
          paidAt: null,
        }),
      }),
    );
    expect(invoiceStatus.refreshFromInstalment).toHaveBeenCalledWith(
      'invoice-1',
      undefined,
    );
  });

  it('ne réactive pas un retry automatique à cause d’un webhook ancien', async () => {
    client.payments.find.mockResolvedValue({
      id: 'PM1',
      status: 'failed',
      links: { instalment_schedule: 'IS1' },
    });
    prisma.invoicePaymentInstalment.findUnique.mockResolvedValue({
      id: 'instalment-1',
      amountInCents: 5000,
      instalmentStatus: 'FAILED',
      automaticRetryScheduled: false,
      manualRetryRequestedAt: null,
      lastProviderEventAt: new Date('2026-08-22T12:00:00.000Z'),
      invoiceInstalmentPlan: { invoiceId: 'invoice-1' },
    });
    matcher.matchPaymentAttemptStatus.mockReturnValue('FAILED');

    await handler.handleWebhook({
      ...event,
      action: 'failed',
      details: { will_attempt_retry: true },
    });

    expect(prisma.invoicePaymentInstalment.update).not.toHaveBeenCalled();
  });

  it('rattache un paiement manquant uniquement à une échéance non ambiguë', async () => {
    client.payments.find.mockResolvedValue({
      id: 'PM1',
      amount: 5000,
      charge_date: '2026-08-21',
      status: 'confirmed',
      links: { instalment_schedule: 'IS1', mandate: 'MD1' },
    });
    client.instalmentSchedules.find.mockResolvedValue({
      links: { payments: ['PM1'] },
    });
    prisma.invoiceInstalmentPlan.findFirst.mockResolvedValue({
      invoiceId: 'invoice-1',
      providerMandateId: 'MD1',
      invoicePaymentInstalments: [
        {
          id: 'instalment-1',
          amountInCents: 5000,
          dueDate: new Date('2026-08-21'),
          providerPaymentId: null,
          instalmentStatus: 'PENDING',
          automaticRetryScheduled: false,
          manualRetryRequestedAt: null,
          lastProviderEventAt: null,
        },
      ],
    });
    await handler.handleWebhook(event);
    expect(prisma.invoicePaymentInstalment.updateMany).toHaveBeenCalledWith({
      where: { id: 'instalment-1', providerPaymentId: null },
      data: { providerPaymentId: 'PM1' },
    });
    expect(invoiceStatus.refreshFromInstalment).toHaveBeenCalledWith(
      'invoice-1',
      5000,
    );
  });
});
