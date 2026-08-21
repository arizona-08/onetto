jest.mock('../gocardless-oauth.service', () => ({
  GoCardlessOAuthService: class GoCardlessOAuthService {},
}));

import { GoCardlessPaymentWebhookHandler } from './gocardless-payment-webhook.handler';

const event = {
  id: 'EV1', action: 'confirmed', organisation_id: 'OR1',
  links: { payment: 'PM1' }, created_at: '2026-08-21T12:00:00.000Z',
  resource_type: 'payments', details: {}, metadata: {}, resource_metadata: {},
};

describe('GoCardlessPaymentWebhookHandler', () => {
  const client = { payments: { find: jest.fn() } };
  const oauth = { getClientForProviderAccount: jest.fn().mockResolvedValue(client) };
  const matcher = { matchPaymentAttemptStatus: jest.fn().mockReturnValue('SUCCESS') };
  const prisma = {
    invoicePaymentInstalment: { findUnique: jest.fn(), update: jest.fn() },
    payByBankPaymentAttempt: { findFirst: jest.fn(), findUnique: jest.fn(), update: jest.fn(), upsert: jest.fn() },
    payByBankPayment: { findUnique: jest.fn() },
  };
  const invoiceStatus = { refreshFromInstalment: jest.fn(), refreshFromPaymentAttempt: jest.fn() };
  let handler: GoCardlessPaymentWebhookHandler;

  beforeEach(() => {
    jest.resetAllMocks();
    oauth.getClientForProviderAccount.mockResolvedValue(client);
    client.payments.find.mockResolvedValue({ id: 'PM1', status: 'confirmed', links: {} });
    matcher.matchPaymentAttemptStatus.mockReturnValue('SUCCESS');
    handler = new GoCardlessPaymentWebhookHandler(oauth as never, matcher as never, prisma as never, invoiceStatus as never);
  });

  it('synchronise un Payment Pay by Bank déjà associé à une tentative', async () => {
    prisma.payByBankPaymentAttempt.findFirst.mockResolvedValue({ id: 'attempt-1', payByBankPaymentId: 'pbb-1', paymentStatus: 'PENDING' });

    await handler.handleWebhook(event);

    expect(prisma.payByBankPaymentAttempt.update).toHaveBeenCalledWith({ where: { id: 'attempt-1' }, data: { paymentStatus: 'SUCCESS' } });
    expect(invoiceStatus.refreshFromPaymentAttempt).toHaveBeenCalledWith('pbb-1', true);
  });

  it('route un Payment associé à une échéance sans chercher un Pay by Bank', async () => {
    client.payments.find.mockResolvedValue({ id: 'PM1', status: 'confirmed', links: { instalment_schedule: 'IS1' } });
    prisma.invoicePaymentInstalment.findUnique.mockResolvedValue({ id: 'instalment-1', instalmentStatus: 'PENDING', invoiceInstalmentPlan: { invoiceId: 'invoice-1' } });

    await handler.handleWebhook(event);

    expect(prisma.invoicePaymentInstalment.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'instalment-1' } }));
    expect(invoiceStatus.refreshFromInstalment).toHaveBeenCalledWith('invoice-1');
    expect(prisma.payByBankPaymentAttempt.findFirst).not.toHaveBeenCalled();
  });

  it('ignore sans erreur un Payment qui ne correspond à aucune ressource Onetto', async () => {
    prisma.payByBankPaymentAttempt.findFirst.mockResolvedValue(null);
    prisma.payByBankPayment.findUnique.mockResolvedValue(null);

    await expect(handler.handleWebhook(event)).resolves.toBeUndefined();
    expect(prisma.payByBankPaymentAttempt.upsert).not.toHaveBeenCalled();
  });

  it('est idempotent et ne régresse pas un statut terminal sur un événement tardif', async () => {
    client.payments.find.mockResolvedValue({ id: 'PM1', status: 'created', links: { instalment_schedule: 'IS1' } });
    prisma.invoicePaymentInstalment.findUnique.mockResolvedValue({ id: 'instalment-1', instalmentStatus: 'SUCCESS', invoiceInstalmentPlan: { invoiceId: 'invoice-1' } });
    matcher.matchPaymentAttemptStatus.mockReturnValue('PENDING');

    await handler.handleWebhook({ ...event, id: 'EV-late', action: 'created' });
    await handler.handleWebhook({ ...event, id: 'EV-duplicate', action: 'created' });

    expect(prisma.invoicePaymentInstalment.update).not.toHaveBeenCalled();
    expect(invoiceStatus.refreshFromInstalment).not.toHaveBeenCalled();
  });
});
