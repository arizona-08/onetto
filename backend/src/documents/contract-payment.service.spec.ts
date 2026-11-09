import { ContractPaymentService } from './contract-payment.service';

jest.mock('src/Adapters/PaymentAdapters/gocardless/gocardless-oauth.service', () => ({
  GoCardlessOAuthService: class {},
}));

describe('ContractPaymentService mandate authorisation', () => {
  const plan = {
    id: 'plan-1',
    acceptedAt: new Date(),
    authorizationExpiresAt: new Date(Date.now() + 86_400_000),
    providerBillingRequestId: 'BRQ1',
    providerFlowId: 'FLOW1',
    providerFlowUrl: 'https://pay.example/flow',
    providerFlowExpiresAt: new Date(Date.now() + 3_600_000),
    providerMandateId: null,
    mandateStatus: 'PENDING',
    cancelledAt: null,
    estimate: {
      companyId: 'company-1',
      clientName: 'Alice Client',
      clientEmail: 'alice@example.com',
      clientAddress: '1 rue Test',
      clientCity: 'Paris',
      clientPostalCode: '75001',
      clientCountry: 'FR',
      estimateStatus: 'ACCEPTED',
      company: { status: 'ACTIVE' },
    },
  };
  const client = {
    billingRequests: {
      create: jest.fn(),
      find: jest.fn(),
    },
    billingRequestFlows: { create: jest.fn() },
    mandates: { find: jest.fn() },
    payments: { create: jest.fn() },
  };
  const tx = {
    $queryRaw: jest.fn(),
    contractPaymentPlan: { findUnique: jest.fn(), update: jest.fn() },
    estimateNegociation: { findFirst: jest.fn() },
  };
  const prisma = {
    $transaction: jest.fn((work: (value: typeof tx) => Promise<unknown>) => work(tx)),
    contractPaymentPlan: { findUnique: jest.fn(), update: jest.fn() },
    contractPaymentStage: { findUnique: jest.fn() },
    contractStagePayment: { create: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
    document: { update: jest.fn() },
  };
  const oauth = { getClientForCompany: jest.fn() };
  const config = { get: jest.fn(() => 'https://example.com/return') };
  const service = new ContractPaymentService(prisma as never, oauth as never, config as never, {} as never, {} as never, {} as never);

  beforeEach(() => {
    jest.clearAllMocks();
    tx.$queryRaw.mockResolvedValue([{ id: plan.id }]);
    tx.contractPaymentPlan.findUnique.mockResolvedValue({ ...plan });
    tx.contractPaymentPlan.update.mockResolvedValue({ ...plan });
    tx.estimateNegociation.findFirst.mockResolvedValue({ id: 'negotiation-1' });
    oauth.getClientForCompany.mockResolvedValue(client);
    client.billingRequests.find.mockResolvedValue({ status: 'pending' });
    client.mandates.find.mockResolvedValue({ status: 'active' });
    client.payments.create.mockResolvedValue({ id: 'PM1', amount: '3000', charge_date: '2099-01-10', links: { mandate: 'MD1' } });
    prisma.contractStagePayment.create.mockResolvedValue({ id: 'payment-1' });
    prisma.contractStagePayment.update.mockResolvedValue({ id: 'payment-1' });
  });

  it('reuses a valid flow without creating a payment', async () => {
    await expect(service.getMandateAuthorisation('token')).resolves.toEqual({ url: plan.providerFlowUrl });
    expect(client.billingRequestFlows.create).not.toHaveBeenCalled();
    expect(client.payments.create).not.toHaveBeenCalled();
  });

  it('keeps a quote pending while the customer has not completed GoCardless', async () => {
    tx.contractPaymentPlan.findUnique.mockResolvedValue({
      ...plan,
      acceptedAt: null,
      acceptanceRequestedAt: new Date(),
      estimate: { ...plan.estimate, estimateStatus: 'SENT' },
    });
    await expect(service.getMandateAuthorisation('token')).resolves.toEqual({ url: plan.providerFlowUrl });
    expect(tx.contractPaymentPlan.update).not.toHaveBeenCalled();
    expect(client.payments.create).not.toHaveBeenCalled();
  });

  it('renews an expired flow against the same BillingRequest', async () => {
    tx.contractPaymentPlan.findUnique.mockResolvedValue({ ...plan, providerFlowExpiresAt: new Date(0) });
    client.billingRequestFlows.create.mockResolvedValue({
      id: 'FLOW2', authorisation_url: 'https://pay.example/new', expires_at: new Date(Date.now() + 3_600_000).toISOString(),
    });
    await expect(service.getMandateAuthorisation('token')).resolves.toEqual({ url: 'https://pay.example/new' });
    expect(client.billingRequestFlows.create).toHaveBeenCalledWith(
      expect.objectContaining({ links: { billing_request: 'BRQ1' } }),
      'contract-flow-plan-1-FLOW1',
    );
    expect(client.payments.create).not.toHaveBeenCalled();
  });

  it('does not create a flow after the Onetto deadline', async () => {
    tx.contractPaymentPlan.findUnique.mockResolvedValue({ ...plan, authorizationExpiresAt: new Date(0) });
    await expect(service.getMandateAuthorisation('token')).resolves.toMatchObject({ url: null });
    expect(oauth.getClientForCompany).not.toHaveBeenCalled();
  });

  it('does not create another flow once a mandate exists', async () => {
    tx.contractPaymentPlan.findUnique.mockResolvedValue({ ...plan, providerMandateId: 'MD1', mandateStatus: 'ACTIVE' });
    await expect(service.getMandateAuthorisation('token')).resolves.toMatchObject({ url: null });
    expect(client.mandates.find).toHaveBeenCalledWith('MD1');
    expect(client.billingRequestFlows.create).not.toHaveBeenCalled();
  });

  it('retrieves a mandate missed by webhooks before offering a stage payment', async () => {
    prisma.contractPaymentStage.findUnique.mockResolvedValue({
      id: 'stage-1',
      kind: 'DEPOSIT',
      sequence: 1,
      amountInCents: 3000,
      cancelledAt: null,
      payment: null,
      invoice: { id: 'invoice-1', companyId: 'company-1', clientName: 'Alice Client', documentNumber: '#FACT-2099-0010', invoiceStatus: 'PENDING', totalPrice: 30 },
      plan: {
        id: 'plan-1',
        ...plan,
        acceptedAt: new Date(),
        mandateStatus: 'PENDING',
        providerBillingRequestId: 'BRQ1',
        providerMandateId: null,
        estimate: {
          companyId: 'company-1',
          estimateStatus: 'ACCEPTED',
          company: { id: 'company-1', ownerId: 'user-1', status: 'ACTIVE', companyUsers: [] },
        },
        stages: [],
      },
    });
    client.billingRequests.find.mockResolvedValue({ status: 'fulfilled', links: { mandate_request_mandate: 'MD1' } });
    client.mandates.find.mockResolvedValue({ status: 'active', next_possible_charge_date: '2099-01-10' });

    await expect(service.getStagePaymentPreview('stage-1', { id: 'user-1' } as never)).resolves.toMatchObject({
      mandateId: 'MD1',
      chargeDate: '2099-01-10',
    });
    expect(prisma.contractPaymentPlan.update).toHaveBeenCalledWith({
      where: { id: 'plan-1' },
      data: { providerMandateId: 'MD1', mandateStatus: 'ACTIVE' },
    });
    expect(client.payments.create).not.toHaveBeenCalled();
  });

  describe('stage payment mandate eligibility', () => {
    beforeEach(() => {
      prisma.contractPaymentStage.findUnique.mockResolvedValue({
        id: 'stage-1', kind: 'DEPOSIT', sequence: 1, amountInCents: 3000, cancelledAt: null, payment: null,
        invoice: { id: 'invoice-1', companyId: 'company-1', invoiceStatus: 'PENDING', totalPrice: 30 },
        plan: {
          ...plan, acceptedAt: new Date(), providerMandateId: 'MD1', mandateStatus: 'PENDING',
          estimate: { companyId: 'company-1', estimateStatus: 'ACCEPTED', company: { ownerId: 'user-1', status: 'ACTIVE', companyUsers: [] } },
          stages: [],
        },
      });
    });

    it.each(['pending_submission', 'submitted', 'active'])(
      'creates a payment for a %s mandate using the provider charge date',
      async (status) => {
        client.mandates.find.mockResolvedValue({ status, next_possible_charge_date: '2099-01-10' });
        prisma.$transaction.mockImplementationOnce((work: (value: unknown) => Promise<unknown>) =>
          work({ contractStagePayment: prisma.contractStagePayment, document: prisma.document }),
        );

        await expect(service.triggerStagePayment('stage-1', { id: 'user-1' } as never, false)).resolves.toMatchObject({
          providerPaymentId: 'PM1', chargeDate: '2099-01-10',
        });
        expect(client.payments.create).toHaveBeenCalledWith(
          expect.objectContaining({ charge_date: '2099-01-10', links: { mandate: 'MD1' } }),
          'contract-stage-stage-1',
        );
        if (status !== 'active') {
          expect(prisma.contractPaymentPlan.update).not.toHaveBeenCalledWith(
            expect.objectContaining({ data: expect.objectContaining({ mandateStatus: 'ACTIVE' }) }),
          );
        }
      },
    );

    it.each(['failed', 'cancelled', 'blocked', 'expired', 'pending_customer_approval', 'unknown'])(
      'blocks a payment for a %s mandate',
      async (status) => {
        client.mandates.find.mockResolvedValue({ status, next_possible_charge_date: '2099-01-10' });

        await expect(service.triggerStagePayment('stage-1', { id: 'user-1' } as never, false)).rejects.toThrow();
        expect(prisma.contractStagePayment.create).not.toHaveBeenCalled();
        expect(client.payments.create).not.toHaveBeenCalled();
      },
    );

    it.each([undefined, 'invalid-date'])(
      'blocks payment creation when the provider charge date is %s',
      async (next_possible_charge_date) => {
        client.mandates.find.mockResolvedValue({ status: 'pending_submission', next_possible_charge_date });

        await expect(service.triggerStagePayment('stage-1', { id: 'user-1' } as never, false)).rejects.toThrow('date de prélèvement possible');
        expect(prisma.contractStagePayment.create).not.toHaveBeenCalled();
        expect(client.payments.create).not.toHaveBeenCalled();
      },
    );
  });

  describe('manual stage payments', () => {
    const preview = {
      clientName: 'Alice Client', invoiceNumber: '#FACT-2099-0010', amountInCents: 3000,
      chargeDate: '2099-01-10', earlierUnpaidInCents: 0,
      companyId: 'company-1', mandateId: 'MD1', invoiceId: 'invoice-1', stageName: '1er acompte',
    };

    beforeEach(() => {
      jest.spyOn(service, 'getStagePaymentPreview').mockResolvedValue(preview);
      prisma.$transaction.mockImplementation((work: (value: unknown) => Promise<unknown>) =>
        work({ contractStagePayment: prisma.contractStagePayment, document: prisma.document }),
      );
    });

    it('creates a single one-off GoCardless Payment after a committed reservation', async () => {
      await expect(service.triggerStagePayment('stage-1', { id: 'user-1' } as never, false)).resolves.toMatchObject({ providerPaymentId: 'PM1' });
      expect(prisma.contractStagePayment.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ stageId: 'stage-1', idempotencyKey: 'contract-stage-stage-1' }),
      });
      expect(client.payments.create).toHaveBeenCalledWith(expect.objectContaining({
        amount: '3000', currency: 'EUR', charge_date: '2099-01-10', links: { mandate: 'MD1' },
      }), 'contract-stage-stage-1');
    });

    it('requires a second acknowledgement when an earlier stage is unpaid', async () => {
      jest.spyOn(service, 'getStagePaymentPreview').mockResolvedValue({ ...preview, earlierUnpaidInCents: 1000 });
      await expect(service.triggerStagePayment('stage-1', { id: 'user-1' } as never, false)).rejects.toThrow();
      expect(client.payments.create).not.toHaveBeenCalled();
    });

    it('never recreates a payment after a timeout with an uncertain provider result', async () => {
      client.payments.create.mockRejectedValue(new Error('timeout'));
      await expect(service.triggerStagePayment('stage-1', { id: 'user-1' } as never, false)).rejects.toThrow();
      expect(prisma.contractStagePayment.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: 'UNCERTAIN' }) }));
      prisma.contractStagePayment.create.mockRejectedValue(new Error('unique constraint'));
      prisma.contractStagePayment.findUnique.mockResolvedValue({ id: 'payment-1' });
      await expect(service.triggerStagePayment('stage-1', { id: 'user-1' } as never, false)).rejects.toThrow();
      expect(client.payments.create).toHaveBeenCalledTimes(1);
    });
  });
});
