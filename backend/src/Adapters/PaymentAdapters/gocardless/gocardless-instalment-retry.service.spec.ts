/* eslint-disable @typescript-eslint/no-unsafe-assignment -- Jest matchers are dynamically typed. */
jest.mock('./gocardless-oauth.service', () => ({
  GoCardlessOAuthService: class GoCardlessOAuthService {},
}));

import { GoCardlessInstalmentRetryService } from './gocardless-instalment-retry.service';

describe('GoCardlessInstalmentRetryService', () => {
  const user = { id: 'user-1' } as never;
  const client = {
    payments: { find: jest.fn(), retry: jest.fn() },
    mandates: { find: jest.fn() },
    events: { all: jest.fn() },
  };
  const prisma = {
    invoicePaymentInstalment: {
      findFirst: jest.fn(),
      updateMany: jest.fn(),
      update: jest.fn(),
    },
  };
  const oauth = { getClientForCompany: jest.fn().mockResolvedValue(client) };
  const planAccess = { assertFeatureAvailable: jest.fn() };
  const invoiceStatus = { refreshFromInstalment: jest.fn() };
  let service: GoCardlessInstalmentRetryService;

  const instalment = (automaticRetryScheduled = false) => ({
    id: 'instalment-1',
    instalmentNumber: 2,
    amountInCents: 30000,
    instalmentStatus: 'FAILED',
    providerPaymentId: 'PM1',
    automaticRetryScheduled,
    manualRetryRequestedAt: null,
    invoiceInstalmentPlan: {
      invoiceId: 'invoice-1',
      providerMandateId: 'MD1',
      invoice: {
        id: 'invoice-1',
        type: 'INVOICE',
        companyId: 'company-1',
        company: { ownerId: 'user-1', status: 'ACTIVE', companyUsers: [] },
      },
    },
  });

  beforeEach(() => {
    jest.resetAllMocks();
    oauth.getClientForCompany.mockResolvedValue(client);
    prisma.invoicePaymentInstalment.findFirst.mockResolvedValue(instalment());
    prisma.invoicePaymentInstalment.updateMany.mockResolvedValue({ count: 1 });
    client.payments.find.mockResolvedValue({
      id: 'PM1',
      status: 'failed',
      charge_date: '2026-09-15',
      links: { mandate: 'MD1' },
    });
    client.mandates.find.mockResolvedValue({ id: 'MD1', status: 'active' });
    client.events.all.mockImplementation(async function* () {
      await Promise.resolve();
      yield* [];
    });
    service = new GoCardlessInstalmentRetryService(
      prisma as never,
      oauth as never,
      planAccess as never,
      invoiceStatus as never,
    );
  });

  it('autorise le retry manuel uniquement pour un Payment failed et un mandat actif', async () => {
    await expect(
      service.getCapability('invoice-1', 2, user),
    ).resolves.toMatchObject({
      canRetryManually: true,
      automaticRetryScheduled: false,
      mandateActionRequired: false,
    });
  });

  it('bloque le retry manuel lorsqu’un retry automatique est planifié', async () => {
    prisma.invoicePaymentInstalment.findFirst.mockResolvedValue(
      instalment(true),
    );

    await expect(
      service.getCapability('invoice-1', 2, user),
    ).resolves.toMatchObject({
      canRetryManually: false,
      automaticRetryScheduled: true,
    });
    expect(client.mandates.find).not.toHaveBeenCalled();
  });

  it('ne rend pas OVERDUE retryable si le Payment réel est encore submitted', async () => {
    client.payments.find.mockResolvedValue({
      id: 'PM1',
      status: 'submitted',
      links: { mandate: 'MD1' },
    });

    await expect(
      service.getCapability('invoice-1', 2, user),
    ).resolves.toMatchObject({
      canRetryManually: false,
      mandateActionRequired: false,
    });
  });

  it('demande une nouvelle autorisation quand le mandat est invalide', async () => {
    client.mandates.find.mockResolvedValue({ id: 'MD1', status: 'cancelled' });

    await expect(
      service.getCapability('invoice-1', 2, user),
    ).resolves.toMatchObject({
      canRetryManually: false,
      mandateActionRequired: true,
    });
  });

  it('resoumet le même Payment sans créer de nouvelle échéance', async () => {
    client.payments.retry.mockResolvedValue({
      id: 'PM1',
      status: 'pending_submission',
    });
    client.payments.find.mockResolvedValue({
      id: 'PM1',
      status: 'failed',
      links: { mandate: 'MD1' },
    });

    await service.retry('invoice-1', 2, user);

    expect(client.payments.retry).toHaveBeenCalledWith('PM1');
    expect(prisma.invoicePaymentInstalment.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'instalment-1',
        automaticRetryScheduled: false,
        manualRetryRequestedAt: null,
        instalmentStatus: { in: ['FAILED', 'OVERDUE'] },
      },
      data: {
        instalmentStatus: 'PAYMENT_IN_PROGRESS',
        manualRetryRequestedAt: expect.any(Date),
      },
    });
    expect(invoiceStatus.refreshFromInstalment).toHaveBeenCalledWith(
      'invoice-1',
    );
    expect(prisma.invoicePaymentInstalment.update).not.toHaveBeenCalled();
    expect(prisma.invoicePaymentInstalment).not.toHaveProperty('create');
  });

  it('refuse une seconde soumission concurrente du même Payment', async () => {
    prisma.invoicePaymentInstalment.updateMany.mockResolvedValue({ count: 0 });

    await expect(service.retry('invoice-1', 2, user)).rejects.toThrow(
      'déjà en cours de traitement',
    );

    expect(client.payments.retry).not.toHaveBeenCalled();
  });

  it('ne transmet qu’un retry lorsque deux demandes arrivent en même temps', async () => {
    let releaseProvider!: (value: { status: string }) => void;
    client.payments.retry.mockReturnValue(
      new Promise((resolve) => {
        releaseProvider = resolve;
      }),
    );
    prisma.invoicePaymentInstalment.updateMany
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 0 })
      .mockResolvedValue({ count: 1 });

    const first = service.retry('invoice-1', 2, user);
    await new Promise((resolve) => setImmediate(resolve));
    const second = service.retry('invoice-1', 2, user);

    await expect(second).rejects.toThrow('déjà en cours de traitement');
    releaseProvider({ status: 'submitted' });
    await expect(first).resolves.toMatchObject({ canRetryManually: false });
    expect(client.payments.retry).toHaveBeenCalledTimes(1);
  });

  it('refuse une échéance déjà payée', async () => {
    prisma.invoicePaymentInstalment.findFirst.mockResolvedValue({
      ...instalment(),
      instalmentStatus: 'SUCCESS',
    });
    await expect(service.retry('invoice-1', 2, user)).rejects.toThrow(
      'déjà réglée',
    );
    expect(client.payments.retry).not.toHaveBeenCalled();
  });

  it('refuse un paiement encore en cours chez GoCardless', async () => {
    client.payments.find.mockResolvedValue({
      status: 'submitted',
      links: { mandate: 'MD1' },
    });
    await expect(service.retry('invoice-1', 2, user)).rejects.toThrow(
      'déjà en cours',
    );
    expect(client.payments.retry).not.toHaveBeenCalled();
  });

  it('refuse une quatrième tentative', async () => {
    client.events.all.mockImplementation(async function* () {
      await Promise.resolve();
      for (let index = 0; index < 3; index++)
        yield { action: 'resubmission_requested' };
    });
    await expect(service.retry('invoice-1', 2, user)).rejects.toThrow(
      'limite de trois',
    );
    expect(client.payments.retry).not.toHaveBeenCalled();
  });

  it('refuse une entreprise fermée ou un collaborateur sans droit ADMIN', async () => {
    prisma.invoicePaymentInstalment.findFirst.mockResolvedValue({
      ...instalment(),
      invoiceInstalmentPlan: {
        ...instalment().invoiceInstalmentPlan,
        invoice: {
          ...instalment().invoiceInstalmentPlan.invoice,
          company: {
            ownerId: 'another-user',
            status: 'ACTIVE',
            companyUsers: [],
          },
        },
      },
    });
    await expect(service.retry('invoice-1', 2, user)).rejects.toThrow('accès');
    expect(client.payments.retry).not.toHaveBeenCalled();
    expect(prisma.invoicePaymentInstalment.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        select: expect.objectContaining({
          invoiceInstalmentPlan: expect.objectContaining({
            select: expect.objectContaining({
              invoice: expect.objectContaining({
                select: expect.objectContaining({
                  company: expect.objectContaining({
                    select: expect.objectContaining({
                      companyUsers: expect.objectContaining({
                        where: {
                          userId: 'user-1',
                          role: 'ADMIN',
                          isHidden: false,
                        },
                      }),
                    }),
                  }),
                }),
              }),
            }),
          }),
        }),
      }),
    );
  });

  it('expose un motif connu et la date du dernier essai sans divulguer le détail bancaire', async () => {
    client.events.all.mockImplementation(async function* () {
      await Promise.resolve();
      yield {
        action: 'submitted',
        created_at: '2026-10-30T09:00:00.000Z',
      };
      yield {
        action: 'failed',
        created_at: '2026-11-01T09:00:00.000Z',
        details: {
          cause: 'insufficient_funds',
          description: 'Sensitive details',
        },
      };
    });
    await expect(
      service.getCapability('invoice-1', 2, user),
    ).resolves.toMatchObject({
      failureReason: 'Fonds insuffisants sur le compte du client.',
      lastAttemptAt: '2026-10-30T09:00:00.000Z',
    });
  });

  it('garde la réservation si la réponse de GoCardless est incertaine', async () => {
    client.payments.retry.mockRejectedValue(new Error('timeout'));
    await expect(service.retry('invoice-1', 2, user)).rejects.toThrow(
      'incertaine',
    );
    expect(prisma.invoicePaymentInstalment.updateMany).toHaveBeenCalledTimes(1);
  });

  it('libère une réservation incertaine après un nouvel échec confirmé par le provider', async () => {
    const requestedAt = new Date('2026-11-02T09:00:00.000Z');
    prisma.invoicePaymentInstalment.findFirst.mockResolvedValue({
      ...instalment(),
      instalmentStatus: 'PAYMENT_IN_PROGRESS',
      manualRetryRequestedAt: requestedAt,
    });
    client.events.all.mockImplementation(async function* () {
      await Promise.resolve();
      yield {
        action: 'failed',
        created_at: '2026-11-02T10:00:00.000Z',
        details: { will_attempt_retry: false },
      };
    });

    await expect(
      service.getCapability('invoice-1', 2, user),
    ).resolves.toMatchObject({ canRetryManually: true });
    expect(prisma.invoicePaymentInstalment.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'instalment-1',
        manualRetryRequestedAt: requestedAt,
        instalmentStatus: 'PAYMENT_IN_PROGRESS',
      },
      data: expect.objectContaining({
        instalmentStatus: 'FAILED',
        manualRetryRequestedAt: null,
        automaticRetryScheduled: false,
      }),
    });
    expect(invoiceStatus.refreshFromInstalment).toHaveBeenCalledWith(
      'invoice-1',
      undefined,
      'instalment-1',
    );
  });

  it('ne libère pas une réservation incertaine sur un événement ancien', async () => {
    prisma.invoicePaymentInstalment.findFirst.mockResolvedValue({
      ...instalment(),
      instalmentStatus: 'PAYMENT_IN_PROGRESS',
      manualRetryRequestedAt: new Date('2026-11-02T10:00:00.000Z'),
    });
    client.events.all.mockImplementation(async function* () {
      await Promise.resolve();
      yield { action: 'failed', created_at: '2026-11-02T09:00:00.000Z' };
    });

    await expect(
      service.getCapability('invoice-1', 2, user),
    ).resolves.toMatchObject({ canRetryManually: false });
    expect(prisma.invoicePaymentInstalment.updateMany).not.toHaveBeenCalled();
  });

  it('libère la réservation après un refus définitif du provider', async () => {
    client.payments.retry.mockRejectedValue({
      statusCode: 422,
      errors: [{ reason: 'retry_failed' }],
    });
    await expect(service.retry('invoice-1', 2, user)).rejects.toThrow('refuse');
    expect(prisma.invoicePaymentInstalment.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'instalment-1',
        manualRetryRequestedAt: { not: null },
        instalmentStatus: 'PAYMENT_IN_PROGRESS',
      },
      data: { instalmentStatus: 'FAILED', manualRetryRequestedAt: null },
    });
  });
});
