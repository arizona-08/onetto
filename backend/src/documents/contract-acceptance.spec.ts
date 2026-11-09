import { finalizePendingContractAcceptance } from './contract-acceptance';

describe('finalizePendingContractAcceptance', () => {
  const tx = {
    $queryRaw: jest.fn(),
    contractPaymentPlan: { findUnique: jest.fn(), updateMany: jest.fn() },
    estimateNegociation: { findFirst: jest.fn(), updateMany: jest.fn() },
    document: { updateMany: jest.fn() },
  };
  const prisma = {
    $transaction: jest.fn((work: (client: typeof tx) => Promise<unknown>) => work(tx)),
  };
  const notifications = { notifyCompany: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
    tx.$queryRaw.mockResolvedValue([{ id: 'negotiation-1' }]);
    tx.contractPaymentPlan.findUnique.mockResolvedValue({
      id: 'plan-1', estimateId: 'estimate-1', acceptanceRequestedAt: new Date(),
      acceptedAt: null, cancelledAt: null, providerBillingRequestId: 'BRQ1', providerMandateId: 'MD1',
      estimate: { companyId: 'company-1', documentNumber: 'DEV-1', estimateStatus: 'SENT', isLastVersion: true, company: { status: 'ACTIVE' } },
    });
    tx.estimateNegociation.findFirst.mockResolvedValue({ id: 'negotiation-1' });
    tx.contractPaymentPlan.updateMany.mockResolvedValue({ count: 1 });
    tx.document.updateMany.mockResolvedValue({ count: 1 });
    tx.estimateNegociation.updateMany.mockResolvedValue({ count: 1 });
  });

  it('accepts the estimate only after a mandate has been recorded', async () => {
    await expect(finalizePendingContractAcceptance(prisma as never, notifications as never, 'plan-1')).resolves.toBe(true);
    expect(tx.contractPaymentPlan.updateMany).toHaveBeenCalledWith({
      where: { id: 'plan-1', acceptedAt: null, cancelledAt: null },
      data: { acceptedAt: expect.any(Date) },
    });
    expect(tx.document.updateMany).toHaveBeenCalledWith({
      where: { id: 'estimate-1', estimateStatus: 'SENT' },
      data: { estimateStatus: 'ACCEPTED' },
    });
    expect(tx.estimateNegociation.updateMany).toHaveBeenCalledWith({
      where: { id: 'negotiation-1', status: 'PENDING' },
      data: { status: 'ACCEPTED' },
    });
    expect(notifications.notifyCompany).toHaveBeenCalledTimes(1);
  });

  it('keeps the estimate sent while the mandate is absent', async () => {
    tx.contractPaymentPlan.findUnique.mockResolvedValueOnce({
      id: 'plan-1', acceptanceRequestedAt: new Date(), acceptedAt: null,
      providerBillingRequestId: 'BRQ1', providerMandateId: null,
      estimate: { estimateStatus: 'SENT', isLastVersion: true, company: { status: 'ACTIVE' } },
    });
    await expect(finalizePendingContractAcceptance(prisma as never, notifications as never, 'plan-1')).resolves.toBe(false);
    expect(tx.document.updateMany).not.toHaveBeenCalled();
    expect(notifications.notifyCompany).not.toHaveBeenCalled();
  });

  it('does not accept a cancelled contract even after a late authorisation', async () => {
    tx.contractPaymentPlan.findUnique.mockResolvedValueOnce({
      id: 'plan-1', acceptanceRequestedAt: new Date(), acceptedAt: null,
      cancelledAt: new Date(), providerBillingRequestId: 'BRQ1', providerMandateId: 'MD1',
      estimate: { estimateStatus: 'SENT', isLastVersion: true, company: { status: 'ACTIVE' } },
    });
    await expect(finalizePendingContractAcceptance(prisma as never, notifications as never, 'plan-1')).resolves.toBe(false);
    expect(tx.document.updateMany).not.toHaveBeenCalled();
  });
});
