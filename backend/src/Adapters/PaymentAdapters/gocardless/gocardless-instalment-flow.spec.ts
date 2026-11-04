/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return, @typescript-eslint/require-await -- Jest mock callback types are dynamic. */
jest.mock('gocardless-nodejs', () => ({
  Environments: {},
  GoCardlessClient: jest.fn(),
}));

import { GoCardlessProviderService } from './gocardless-provider.service';

describe('GoCardless instalment authorisation flow', () => {
  const access = {
    accessToken: 'token',
    expiresAt: new Date('2099-12-31'),
    invoicePaymentLink: {
      id: 'link-1',
      url: 'https://pay.gocardless.com/old',
      provider: 'GOCARDLESS',
      providerReference: 'BRQ1',
      providerFlowId: 'BRF1',
      providerFlowExpiresAt: new Date('2099-01-01'),
      linkStatus: 'VALID',
    },
    invoice: {
      id: 'invoice-1',
      type: 'INVOICE',
      sentAt: new Date('2099-01-01'),
      companyId: 'company-1',
      invoiceStatus: 'PENDING',
      clientName: 'Ada Client',
      clientEmail: 'ada@example.test',
      clientAddress: '1 rue Test',
      clientCity: 'Paris',
      clientPostalCode: '75001',
      clientCountry: 'France',
      company: { status: 'ACTIVE' },
      invoiceInstalmentPlan: {
        providerReference: 'BRQ1',
        invoicePaymentInstalments: [] as Array<{ instalmentStatus: string }>,
        authorizationDeadline: new Date('2099-12-01'),
        authorizationFailureReason: null as string | null,
        providerMandateId: null,
        providerScheduledId: null,
      },
    },
  };
  const prisma = {
    $queryRaw: jest.fn().mockResolvedValue([{ id: 'link-1' }]),
    $transaction: jest.fn(),
    invoicePublicAccess: { findUnique: jest.fn(), upsert: jest.fn() },
    invoicePaymentLink: { update: jest.fn(), create: jest.fn() },
  };
  const client = {
    billingRequests: {
      find: jest.fn().mockResolvedValue({ status: 'pending' }),
    },
    billingRequestFlows: {
      create: jest.fn().mockResolvedValue({
        id: 'BRF2',
        authorisation_url: 'https://pay.gocardless.com/new',
        expires_at: '2099-11-01T00:00:00.000Z',
      }),
    },
  };
  const oauth = { getClientForCompany: jest.fn().mockResolvedValue(client) };
  const config = {
    get: jest.fn().mockReturnValue('https://onetto.test/return'),
  };
  const service = Object.create(
    GoCardlessProviderService.prototype,
  ) as GoCardlessProviderService;

  beforeEach(() => {
    jest.clearAllMocks();
    access.expiresAt = new Date('2099-12-31');
    access.invoicePaymentLink.url = 'https://pay.gocardless.com/old';
    access.invoicePaymentLink.providerReference = 'BRQ1';
    access.invoicePaymentLink.providerFlowId = 'BRF1';
    access.invoicePaymentLink.providerFlowExpiresAt = new Date('2099-01-01');
    access.invoice.invoiceInstalmentPlan.providerMandateId = null;
    access.invoice.invoiceInstalmentPlan.authorizationFailureReason = null;
    access.invoice.invoiceInstalmentPlan.invoicePaymentInstalments = [];
    access.invoice.invoiceInstalmentPlan.authorizationDeadline = new Date(
      '2099-12-01',
    );
    prisma.invoicePublicAccess.findUnique.mockImplementation(
      async () => access,
    );
    prisma.invoicePaymentLink.create.mockResolvedValue({ id: 'link-1' });
    client.billingRequestFlows.create.mockResolvedValue({
      id: 'BRF2',
      authorisation_url: 'https://pay.gocardless.com/new',
      expires_at: '2099-11-01T00:00:00.000Z',
    });
    prisma.$transaction.mockImplementation(async (callback) =>
      callback(prisma),
    );
    client.billingRequests.find.mockResolvedValue({ status: 'pending' });
    Reflect.set(service, 'prismaService', prisma);
    Reflect.set(service, 'gocardlessOAuthService', oauth);
    Reflect.set(service, 'configService', config);
  });

  it('réutilise un flow dont expires_at est futur', async () => {
    expect(
      await service.getCurrentInstalmentFlow('invoice-1', 'token'),
    ).toEqual({
      url: access.invoicePaymentLink.url,
    });
    expect(client.billingRequestFlows.create).not.toHaveBeenCalled();
  });

  it('donne 30 jours au lien Onetto lors de la création', async () => {
    jest.spyOn(service, 'createBillingRequest').mockResolvedValue('BRQ1');
    client.billingRequestFlows.create.mockResolvedValue({
      id: 'BRF1',
      authorisation_url: 'https://pay.gocardless.com/old',
      expires_at: '2099-11-01T00:00:00.000Z',
    });
    const before = Date.now();
    await service.createInstalmentsPaymentLink(
      {
        companyId: 'company-1',
        invoiceId: 'invoice-1',
        customer: { email: 'ada@example.test' },
      } as never,
      'token',
    );
    const expiry = prisma.invoicePublicAccess.upsert.mock.calls[0][0].create
      .expiresAt as Date;
    expect(expiry.getTime()).toBeGreaterThanOrEqual(before + 30 * 86400000);
    expect(expiry.getTime()).toBeLessThanOrEqual(Date.now() + 30 * 86400000);
    expect(prisma.invoicePaymentLink.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          providerFlowId: 'BRF1',
          providerFlowExpiresAt: new Date('2099-11-01'),
        }),
      }),
    );
  });

  it('recrée un flow expiré sur la même Billing Request et enregistre expires_at', async () => {
    access.invoicePaymentLink.providerFlowExpiresAt = new Date('2020-01-01');
    expect(
      await service.getCurrentInstalmentFlow('invoice-1', 'token'),
    ).toEqual({
      url: 'https://pay.gocardless.com/new',
    });
    expect(client.billingRequestFlows.create).toHaveBeenCalledWith(
      expect.objectContaining({ links: { billing_request: 'BRQ1' } }),
      'instalment-flow-link-1-BRF1',
    );
    expect(prisma.invoicePaymentLink.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          providerFlowId: 'BRF2',
          providerFlowExpiresAt: new Date('2099-11-01T00:00:00.000Z'),
        }),
      }),
    );
  });

  it('ne crée rien quand le mandat est autorisé', async () => {
    access.invoice.invoiceInstalmentPlan.providerMandateId = 'MD1' as never;
    expect(
      (await service.getCurrentInstalmentFlow('invoice-1', 'token')).url,
    ).toBeNull();
    expect(client.billingRequestFlows.create).not.toHaveBeenCalled();
  });

  it('préserve le parcours de réautorisation demandé pour une échéance échouée', async () => {
    access.invoicePaymentLink.providerReference = 'BRQ2';
    access.invoice.invoiceInstalmentPlan.providerMandateId = 'MD1' as never;
    access.invoice.invoiceInstalmentPlan.authorizationDeadline = new Date(
      '2020-01-01',
    );
    access.invoice.invoiceInstalmentPlan.invoicePaymentInstalments = [
      { instalmentStatus: 'FAILED' },
    ];
    expect(
      await service.getCurrentInstalmentFlow('invoice-1', 'token'),
    ).toEqual({
      url: 'https://pay.gocardless.com/old',
    });
  });

  it('refuse un lien Onetto expiré', async () => {
    access.expiresAt = new Date('2020-01-01');
    await expect(
      service.getCurrentInstalmentFlow('invoice-1', 'token'),
    ).rejects.toThrow('invalide ou expiré');
    expect(client.billingRequestFlows.create).not.toHaveBeenCalled();
  });

  it('refuse un ancien jeton si le lien a été renouvelé entre les lectures', async () => {
    await expect(
      service.getCurrentInstalmentFlow('invoice-1', 'ancien-token'),
    ).rejects.toThrow('invalide ou expiré');
    expect(client.billingRequestFlows.create).not.toHaveBeenCalled();
  });

  it('bloque les échéances trop proches sans changer leurs dates', async () => {
    access.invoice.invoiceInstalmentPlan.authorizationDeadline = new Date(
      '2020-01-01',
    );
    expect(
      (await service.getCurrentInstalmentFlow('invoice-1', 'token')).message,
    ).toContain('dates de prélèvement');
    expect(client.billingRequestFlows.create).not.toHaveBeenCalled();
  });

  it('affiche la raison précise si GoCardless ne peut plus respecter la date', async () => {
    access.invoice.invoiceInstalmentPlan.authorizationFailureReason =
      'Date de prélèvement impossible';
    expect(
      (await service.getCurrentInstalmentFlow('invoice-1', 'token')).message,
    ).toBe('Date de prélèvement impossible');
    expect(client.billingRequestFlows.create).not.toHaveBeenCalled();
  });

  it('ne recrée pas de Billing Request annulée', async () => {
    client.billingRequests.find.mockResolvedValue({ status: 'cancelled' });
    expect(
      (await service.getCurrentInstalmentFlow('invoice-1', 'token')).message,
    ).toContain('annulée');
    expect(client.billingRequestFlows.create).not.toHaveBeenCalled();
  });

  it('sérialise deux clics et ne crée qu’un flow', async () => {
    access.invoicePaymentLink.providerFlowExpiresAt = new Date('2020-01-01');
    let queue = Promise.resolve();
    prisma.$transaction.mockImplementation((callback) => {
      const result = queue.then(() => callback(prisma));
      queue = result.then(() => undefined);
      return result;
    });
    prisma.invoicePaymentLink.update.mockImplementation(async ({ data }) => {
      Object.assign(access.invoicePaymentLink, data);
    });
    const results = await Promise.all([
      service.getCurrentInstalmentFlow('invoice-1', 'token'),
      service.getCurrentInstalmentFlow('invoice-1', 'token'),
    ]);
    expect(results).toEqual([
      { url: 'https://pay.gocardless.com/new' },
      { url: 'https://pay.gocardless.com/new' },
    ]);
    expect(client.billingRequestFlows.create).toHaveBeenCalledTimes(1);
  });
});
