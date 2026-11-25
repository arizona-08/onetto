jest.mock('gocardless-nodejs', () => ({
  Environments: {},
  GoCardlessClient: jest.fn(),
}));

import { GoCardlessProviderService } from './gocardless-provider.service';

describe('GoCardless one-time payment flow', () => {
  const access = {
    id: 'access-1',
    accessToken: 'old-token',
    expiresAt: new Date('2099-12-31'),
    invoice: {
      type: 'INVOICE',
      invoiceStatus: 'PENDING',
      sentAt: new Date('2026-01-01'),
      companyId: 'company-1',
      clientEmail: 'client@example.test',
      clientName: 'Ada Client',
      clientAddress: '1 rue Test',
      clientCity: 'Paris',
      clientPostalCode: '75001',
      clientCountry: 'France',
      company: { status: 'ACTIVE' },
    },
    invoicePaymentLink: {
      id: 'link-1',
      url: 'https://pay.example/old',
      provider: 'GOCARDLESS',
      providerReference: 'BRQ1',
      providerFlowId: 'BRF1',
      providerFlowExpiresAt: new Date('2099-01-01'),
      linkStatus: 'VALID',
      payByBankPayments: [
        {
          status: 'PENDING',
          payByBankPaymentAttempts: [] as Array<{ paymentStatus: string }>,
        },
      ],
    },
  };
  const prisma = {
    $queryRaw: jest.fn().mockResolvedValue([{ id: 'access-1' }]),
    $transaction: jest.fn(),
    invoicePublicAccess: { findUnique: jest.fn(), update: jest.fn() },
    invoicePaymentLink: { update: jest.fn() },
  };
  const client = {
    billingRequests: { find: jest.fn() },
    billingRequestFlows: { create: jest.fn() },
  };
  const service = Object.create(
    GoCardlessProviderService.prototype,
  ) as GoCardlessProviderService;

  beforeEach(() => {
    jest.clearAllMocks();
    access.accessToken = 'old-token';
    access.expiresAt = new Date('2099-12-31');
    access.invoice.invoiceStatus = 'PENDING';
    access.invoicePaymentLink.url = 'https://pay.example/old';
    access.invoicePaymentLink.providerFlowId = 'BRF1';
    access.invoicePaymentLink.providerFlowExpiresAt = new Date('2020-01-01');
    access.invoicePaymentLink.payByBankPayments[0].status = 'PENDING';
    access.invoicePaymentLink.payByBankPayments[0].payByBankPaymentAttempts =
      [];
    prisma.invoicePublicAccess.findUnique.mockResolvedValue(access);
    prisma.$transaction.mockImplementation(
      async (action: (db: typeof prisma) => Promise<unknown>) =>
        await action(prisma),
    );
    client.billingRequests.find.mockResolvedValue({ status: 'pending' });
    client.billingRequestFlows.create.mockResolvedValue({
      id: 'BRF2',
      authorisation_url: 'https://pay.example/new',
      expires_at: '2099-11-01T00:00:00.000Z',
    });
    Reflect.set(service, 'prismaService', prisma);
    Reflect.set(service, 'gocardlessOAuthService', {
      getClientForCompany: jest.fn().mockResolvedValue(client),
    });
    Reflect.set(service, 'configService', {
      get: jest.fn().mockReturnValue('https://onetto.test/return'),
    });
  });

  it('réutilise le flow et le jeton encore valides en prolongeant le lien Onetto', async () => {
    access.invoicePaymentLink.providerFlowExpiresAt = new Date('2099-12-01');
    const result = await service.getCurrentOneTimeFlow('invoice-1', {
      renewPublicAccess: true,
    });
    expect(result.url).toBe('https://pay.example/old');
    expect(result.accessToken).toBe('old-token');
    expect(client.billingRequestFlows.create).not.toHaveBeenCalled();
    expect(prisma.invoicePublicAccess.update).toHaveBeenCalledTimes(1);
  });

  it('remplace un jeton Onetto expiré lors du renvoi', async () => {
    access.expiresAt = new Date('2020-01-01');
    access.invoicePaymentLink.providerFlowExpiresAt = new Date('2099-12-01');
    const result = await service.getCurrentOneTimeFlow('invoice-1', {
      renewPublicAccess: true,
    });
    expect(result.accessToken).not.toBe('old-token');
    expect(client.billingRequestFlows.create).not.toHaveBeenCalled();
  });

  it('recrée un flow expiré sur la même demande de paiement', async () => {
    access.invoice.invoiceStatus = 'OVERDUE';
    const result = await service.getCurrentOneTimeFlow('invoice-1', {
      renewPublicAccess: true,
    });
    expect(result.url).toBe('https://pay.example/new');
    expect(client.billingRequestFlows.create).toHaveBeenCalledWith(
      expect.objectContaining({ links: { billing_request: 'BRQ1' } }),
      'one-time-flow-link-1-BRF1',
    );
    expect(prisma.invoicePaymentLink.update).toHaveBeenCalledTimes(1);
  });

  it('ne crée rien lorsqu’un paiement est déjà engagé', async () => {
    access.invoicePaymentLink.payByBankPayments[0].payByBankPaymentAttempts = [
      { paymentStatus: 'PAYMENT_IN_PROGRESS' },
    ];
    const result = await service.getCurrentOneTimeFlow('invoice-1', {
      renewPublicAccess: true,
    });
    expect(result.url).toBeNull();
    expect(client.billingRequestFlows.create).not.toHaveBeenCalled();
    expect(prisma.invoicePublicAccess.update).not.toHaveBeenCalled();
  });

  it('refuse une demande GoCardless déjà traitée', async () => {
    client.billingRequests.find.mockResolvedValue({ status: 'fulfilled' });
    const result = await service.getCurrentOneTimeFlow('invoice-1', {
      renewPublicAccess: true,
    });
    expect(result.url).toBeNull();
    expect(client.billingRequestFlows.create).not.toHaveBeenCalled();
  });

  it('sérialise deux ouvertures et ne crée qu’un flow', async () => {
    let queue = Promise.resolve();
    prisma.$transaction.mockImplementation(
      (action: (db: typeof prisma) => Promise<unknown>) => {
        const result = queue.then(async () => await action(prisma));
        queue = result.then(() => undefined);
        return result;
      },
    );
    prisma.invoicePaymentLink.update.mockImplementation(({ data }) => {
      Object.assign(access.invoicePaymentLink, data);
      return Promise.resolve();
    });
    const results = await Promise.all([
      service.getCurrentOneTimeFlow('invoice-1', { accessToken: 'old-token' }),
      service.getCurrentOneTimeFlow('invoice-1', { accessToken: 'old-token' }),
    ]);
    expect(results.map((result) => result.url)).toEqual([
      'https://pay.example/new',
      'https://pay.example/new',
    ]);
    expect(client.billingRequestFlows.create).toHaveBeenCalledTimes(1);
  });

  it('rejette le jeton public expiré sans opération externe', async () => {
    access.expiresAt = new Date('2020-01-01');
    await expect(
      service.getCurrentOneTimeFlow('invoice-1', { accessToken: 'old-token' }),
    ).rejects.toThrow('expiré');
    expect(client.billingRequests.find).not.toHaveBeenCalled();
  });
});
