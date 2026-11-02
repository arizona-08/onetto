jest.mock('../gocardless-reconciliation.service', () => ({
  GoCardlessReconciliationService: class GoCardlessReconciliationService {},
}));

import { GoCardlessInstalmentSchedulesWebhookHandler } from './gocardless-instalment-schedules-webhook.handler';

describe('GoCardlessInstalmentSchedulesWebhookHandler', () => {
  const prisma = { invoiceInstalmentPlan: { findFirst: jest.fn() } };
  const reconciliation = { reconcilePaymentPlan: jest.fn() };
  const handler = new GoCardlessInstalmentSchedulesWebhookHandler(
    prisma as never,
    reconciliation as never,
  );

  beforeEach(() => {
    jest.resetAllMocks();
    prisma.invoiceInstalmentPlan.findFirst.mockResolvedValue({ id: 'plan-1' });
  });

  it('réconcilie les paiements du plan après son événement', async () => {
    await handler.handleWebhook({
      action: 'completed',
      links: { instalment_schedule: 'IS1' },
    } as never);
    expect(reconciliation.reconcilePaymentPlan).toHaveBeenCalledWith('plan-1');
  });

  it('ignore un plan inconnu sans créer de paiement', async () => {
    prisma.invoiceInstalmentPlan.findFirst.mockResolvedValue(null);
    await handler.handleWebhook({
      action: 'created',
      links: { instalment_schedule: 'IS1' },
    } as never);
    expect(reconciliation.reconcilePaymentPlan).not.toHaveBeenCalled();
  });
});
