jest.mock('./gocardless-oauth.service', () => ({
  GoCardlessOAuthService: class GoCardlessOAuthService {},
}));

import { GoCardlessInstalmentRetryService } from './gocardless-instalment-retry.service';

describe('GoCardlessInstalmentRetryService', () => {
  const user = { id: 'user-1' } as never;
  const client = {
    payments: { find: jest.fn(), retry: jest.fn() },
    mandates: { find: jest.fn() },
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
    invoiceInstalmentPlan: {
      invoiceId: 'invoice-1',
      providerMandateId: 'MD1',
      invoice: {
        id: 'invoice-1',
        type: 'INVOICE',
        companyId: 'company-1',
        company: { ownerId: 'user-1', companyUsers: [] },
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
    service = new GoCardlessInstalmentRetryService(
      prisma as never,
      oauth as never,
      planAccess as never,
      invoiceStatus as never,
    );
  });

  it('autorise le retry manuel uniquement pour un Payment failed et un mandat actif', async () => {
    await expect(service.getCapability('invoice-1', 2, user)).resolves.toMatchObject({
      canRetryManually: true,
      automaticRetryScheduled: false,
      mandateActionRequired: false,
    });
  });

  it('bloque le retry manuel lorsqu’un retry automatique est planifié', async () => {
    prisma.invoicePaymentInstalment.findFirst.mockResolvedValue(instalment(true));

    await expect(service.getCapability('invoice-1', 2, user)).resolves.toMatchObject({
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

    await expect(service.getCapability('invoice-1', 2, user)).resolves.toMatchObject({
      canRetryManually: false,
      mandateActionRequired: false,
    });
  });

  it('demande une nouvelle autorisation quand le mandat est invalide', async () => {
    client.mandates.find.mockResolvedValue({ id: 'MD1', status: 'cancelled' });

    await expect(service.getCapability('invoice-1', 2, user)).resolves.toMatchObject({
      canRetryManually: false,
      mandateActionRequired: true,
    });
  });

  it('resoumet le même Payment sans créer de nouvelle échéance', async () => {
    client.payments.retry.mockResolvedValue({
      id: 'PM1',
      status: 'pending_submission',
    });
    client.payments.find
      .mockResolvedValueOnce({
        id: 'PM1',
        status: 'failed',
        links: { mandate: 'MD1' },
      })
      .mockResolvedValueOnce({
        id: 'PM1',
        status: 'pending_submission',
        links: { mandate: 'MD1' },
      });

    await service.retry('invoice-1', 2, user);

    expect(client.payments.retry).toHaveBeenCalledWith('PM1');
    expect(prisma.invoicePaymentInstalment.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'instalment-1',
        automaticRetryScheduled: false,
        instalmentStatus: { in: ['FAILED', 'OVERDUE'] },
      },
      data: { instalmentStatus: 'PAYMENT_IN_PROGRESS' },
    });
    expect(prisma.invoicePaymentInstalment.update).toHaveBeenCalledWith({
      where: { id: 'instalment-1' },
      data: {
        instalmentStatus: 'PAYMENT_IN_PROGRESS',
        automaticRetryScheduled: false,
      },
    });
    expect(prisma.invoicePaymentInstalment).not.toHaveProperty('create');
  });

  it('refuse une seconde soumission concurrente du même Payment', async () => {
    prisma.invoicePaymentInstalment.updateMany.mockResolvedValue({ count: 0 });

    await expect(service.retry('invoice-1', 2, user)).rejects.toThrow(
      'déjà en cours de traitement',
    );

    expect(client.payments.retry).not.toHaveBeenCalled();
  });
});
