/* eslint-disable @typescript-eslint/no-unsafe-assignment -- Jest matchers are dynamically typed. */
jest.mock('./gocardless-oauth.service', () => ({
  GoCardlessOAuthService: class GoCardlessOAuthService {},
}));

import { GoCardlessReconciliationService } from './gocardless-reconciliation.service';

describe('GoCardlessReconciliationService', () => {
  const instalment = (id: string, dueDate: string) => ({
    id,
    providerPaymentId: null as string | null,
    amountInCents: 5000,
    dueDate: new Date(dueDate),
    instalmentStatus: 'PENDING',
  });
  const plan = () => ({
    invoiceId: 'invoice-1',
    providerScheduledId: 'IS1',
    providerMandateId: 'MD1',
    invoice: { companyId: 'company-1', invoiceStatus: 'PENDING' },
    invoicePaymentInstalments: [
      instalment('one', '2026-11-01'),
      instalment('two', '2026-12-01'),
    ],
  });
  const payment = (id: string, date: string, status = 'confirmed') => ({
    id,
    status,
    amount: 5000,
    charge_date: date,
    links: { instalment_schedule: 'IS1', mandate: 'MD1' },
  });
  const client = {
    instalmentSchedules: { find: jest.fn() },
    payments: { find: jest.fn() },
  };
  const prisma = {
    invoiceInstalmentPlan: {
      updateMany: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
    },
    invoicePaymentInstalment: {
      updateMany: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
  };
  const oauth = { getClientForCompany: jest.fn() };
  const handler = { syncInstalmentStatus: jest.fn() };
  const invoiceStatus = { refreshFromInstalment: jest.fn() };
  let service: GoCardlessReconciliationService;

  beforeEach(() => {
    jest.resetAllMocks();
    prisma.invoiceInstalmentPlan.updateMany.mockResolvedValue({ count: 1 });
    prisma.invoiceInstalmentPlan.findUniqueOrThrow.mockResolvedValue(plan());
    prisma.invoiceInstalmentPlan.findUnique.mockResolvedValue({
      reconciliationFailureCount: 0,
    });
    prisma.invoicePaymentInstalment.updateMany.mockResolvedValue({ count: 1 });
    prisma.invoicePaymentInstalment.findUnique.mockImplementation(
      ({ where }: { where: { providerPaymentId: string } }) =>
        where.providerPaymentId === 'PM1'
          ? Promise.resolve({
              id: 'one',
              amountInCents: 5000,
              instalmentStatus: 'PENDING',
              automaticRetryScheduled: false,
              manualRetryRequestedAt: null,
              lastProviderEventAt: null,
              invoiceInstalmentPlan: {
                providerScheduledId: 'IS1',
                invoiceId: 'invoice-1',
                invoice: { companyId: 'company-1', invoiceStatus: 'PENDING' },
              },
            })
          : Promise.resolve(null),
    );
    prisma.invoicePaymentInstalment.findMany.mockResolvedValue([
      {
        instalmentStatus: 'SUCCESS',
        paidAt: new Date('2026-11-01'),
        providerPaymentId: 'PM1',
        dueDate: new Date('2026-11-01'),
      },
      {
        instalmentStatus: 'PENDING',
        paidAt: null,
        providerPaymentId: null,
        dueDate: new Date('2026-12-01'),
      },
    ]);
    oauth.getClientForCompany.mockResolvedValue(client);
    client.instalmentSchedules.find.mockResolvedValue({
      id: 'IS1',
      links: { mandate: 'MD1', payments: ['PM1'] },
    });
    client.payments.find.mockResolvedValue(payment('PM1', '2026-11-01'));
    service = new GoCardlessReconciliationService(
      prisma as never,
      oauth as never,
      handler as never,
      invoiceStatus as never,
    );
  });

  it('associe un paiement manquant par montant et date uniques, puis synchronise son statut', async () => {
    // The first lookup checks whether the ID is already bound elsewhere.
    prisma.invoicePaymentInstalment.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: 'one',
        amountInCents: 5000,
        instalmentStatus: 'PENDING',
        automaticRetryScheduled: false,
        manualRetryRequestedAt: null,
        lastProviderEventAt: null,
        invoiceInstalmentPlan: {
          providerScheduledId: 'IS1',
          invoiceId: 'invoice-1',
          invoice: { companyId: 'company-1', invoiceStatus: 'PENDING' },
        },
      });
    const result = await service.reconcilePaymentPlan('plan-1');

    expect(prisma.invoicePaymentInstalment.updateMany).toHaveBeenCalledWith({
      where: { id: 'one', providerPaymentId: null },
      data: { providerPaymentId: 'PM1' },
    });
    expect(handler.syncInstalmentStatus).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'one' }),
      'confirmed',
    );
    expect(invoiceStatus.refreshFromInstalment).toHaveBeenCalledWith(
      'invoice-1',
    );
    expect(result.requiresPaymentReview).toBe(false);
  });

  it('ne devine pas une association lorsque montant et date sont identiques', async () => {
    prisma.invoiceInstalmentPlan.findUniqueOrThrow.mockResolvedValue({
      ...plan(),
      invoicePaymentInstalments: [
        instalment('one', '2026-11-01'),
        instalment('two', '2026-11-01'),
      ],
    });
    const result = await service.reconcilePaymentPlan('plan-1');
    expect(result.requiresPaymentReview).toBe(true);
    expect(prisma.invoicePaymentInstalment.updateMany).not.toHaveBeenCalled();
    expect(handler.syncInstalmentStatus).not.toHaveBeenCalled();
  });

  it('ne lie pas le premier de deux paiements candidats identiques', async () => {
    client.instalmentSchedules.find.mockResolvedValue({
      id: 'IS1',
      links: { mandate: 'MD1', payments: ['PM1', 'PM2'] },
    });
    client.payments.find.mockImplementation((id: string) =>
      Promise.resolve(payment(id, '2026-11-01')),
    );
    const result = await service.reconcilePaymentPlan('plan-1');
    expect(result.requiresPaymentReview).toBe(true);
    expect(prisma.invoicePaymentInstalment.updateMany).not.toHaveBeenCalled();
  });

  it('refuse un paiement appartenant à une autre entreprise', async () => {
    await expect(
      service.reconcilePayment('other-company', 'PM1'),
    ).rejects.toThrow('introuvable');
    expect(oauth.getClientForCompany).not.toHaveBeenCalled();
  });

  it('reconcilie un paiement connu depuis son état actuel, y compris un échec tardif', async () => {
    client.payments.find.mockResolvedValue(
      payment('PM1', '2026-11-01', 'charged_back'),
    );
    await service.reconcilePayment('company-1', 'PM1');
    expect(handler.syncInstalmentStatus).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'one' }),
      'charged_back',
    );
  });

  it('refuse une ressource bancaire liée à un autre échéancier', async () => {
    client.payments.find.mockResolvedValue({
      ...payment('PM1', '2026-11-01'),
      links: { instalment_schedule: 'IS2', mandate: 'MD1' },
    });
    await expect(service.reconcilePayment('company-1', 'PM1')).rejects.toThrow(
      'incohérente',
    );
    expect(handler.syncInstalmentStatus).not.toHaveBeenCalled();
  });

  it('ne déclenche pas une seconde réconciliation durant le bail', async () => {
    prisma.invoiceInstalmentPlan.updateMany.mockResolvedValue({ count: 0 });
    await expect(service.reconcilePaymentPlan('plan-1')).rejects.toThrow(
      'déjà en cours',
    );
    expect(client.payments.find).not.toHaveBeenCalled();
  });

  it('programme une nouvelle tentative et libère le bail après un incident GoCardless', async () => {
    client.instalmentSchedules.find.mockRejectedValue(
      new Error('provider unavailable'),
    );
    await expect(service.reconcilePaymentPlan('plan-1')).rejects.toThrow(
      'provider unavailable',
    );
    expect(prisma.invoiceInstalmentPlan.update).toHaveBeenCalledWith({
      where: { id: 'plan-1' },
      data: expect.objectContaining({
        reconciliationFailureCount: 1,
        reconciliationLeaseUntil: null,
        nextReconciliationAt: expect.any(Date),
      }),
    });
  });

  it('refuse une actualisation manuelle à un collaborateur sans droit de gestion', async () => {
    prisma.invoiceInstalmentPlan.findUnique.mockResolvedValue({
      id: 'plan-1',
      lastReconciledAt: null,
      invoice: {
        type: 'INVOICE',
        company: { ownerId: 'other-user', status: 'ACTIVE', companyUsers: [] },
      },
    });
    await expect(
      service.reconcileInvoice('invoice-1', { id: 'user-1' } as never),
    ).rejects.toThrow('ne pouvez pas');
    expect(prisma.invoiceInstalmentPlan.updateMany).not.toHaveBeenCalled();
  });

  it('limite les actualisations manuelles répétées', async () => {
    prisma.invoiceInstalmentPlan.findUnique.mockResolvedValue({
      id: 'plan-1',
      lastReconciledAt: new Date(),
      invoice: {
        type: 'INVOICE',
        company: { ownerId: 'user-1', status: 'ACTIVE', companyUsers: [] },
      },
    });
    await expect(
      service.reconcileInvoice('invoice-1', { id: 'user-1' } as never),
    ).rejects.toThrow('récemment');
  });

  it('continue le lot cron après l’échec d’un échéancier', async () => {
    prisma.invoiceInstalmentPlan.findMany.mockResolvedValue([
      { id: 'plan-1' },
      { id: 'plan-2' },
    ]);
    const reconcile = jest.spyOn(service, 'reconcilePaymentPlan');
    reconcile
      .mockRejectedValueOnce(new Error('temporary provider error'))
      .mockResolvedValueOnce({
        message: 'ok',
        requiresPaymentReview: false,
      });
    await service.reconcileDuePlans();
    expect(reconcile).toHaveBeenCalledTimes(2);
  });
});
