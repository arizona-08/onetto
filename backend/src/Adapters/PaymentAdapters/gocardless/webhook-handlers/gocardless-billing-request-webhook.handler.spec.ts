/* eslint-disable @typescript-eslint/no-unsafe-assignment -- Jest asymmetric matchers are dynamically typed. */
jest.mock('gocardless-nodejs', () => ({
  Environments: {},
  GoCardlessClient: jest.fn(),
}));

import { GoCardlessBillingRequestWebhookHandler } from './gocardless-billing-request-webhook.handler';

describe('GoCardless billing request instalment schedule', () => {
  const prisma = {
    invoicePaymentLink: { updateMany: jest.fn() },
    invoiceInstalmentPlan: { findUnique: jest.fn(), update: jest.fn() },
  };
  const client = {
    mandates: { find: jest.fn() },
    instalmentSchedules: { createWithSchedule: jest.fn(), find: jest.fn() },
    billingRequests: { find: jest.fn() },
  };
  const handler = Object.create(
    GoCardlessBillingRequestWebhookHandler.prototype,
  ) as GoCardlessBillingRequestWebhookHandler;
  const input = {
    name: 'Facture 1',
    totalAmountInCents: 10000,
    startDate: '2099-11-15',
    intervalUnit: 'MONTHLY' as const,
    interval: 1,
    amountsInCents: [5000, 5000],
    instalmentNumbers: [1, 2],
    mandateId: 'MD1',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    Reflect.set(handler, 'prismaService', prisma);
    client.mandates.find.mockResolvedValue({
      next_possible_charge_date: '2099-11-10',
    });
    client.instalmentSchedules.createWithSchedule.mockResolvedValue({
      id: 'IS1',
    });
    client.instalmentSchedules.find.mockResolvedValue({
      links: { payments: ['PM1', 'PM2'] },
    });
    jest
      .spyOn(handler, 'updateCreatedInstalmentPlan')
      .mockResolvedValue(undefined);
  });

  it('crée un échéancier avec une clé idempotente si la date est réalisable', async () => {
    await handler.createInstalmentSchedule(input, 'BRQ1', client as never);
    expect(client.instalmentSchedules.createWithSchedule).toHaveBeenCalledWith(
      expect.objectContaining({
        instalments: expect.objectContaining({ start_date: '2099-11-15' }),
      }),
      'instalment-schedule-BRQ1',
    );
  });

  it('bloque un échéancier dont la première date précède la date possible du mandat', async () => {
    client.mandates.find.mockResolvedValue({
      next_possible_charge_date: '2099-11-20',
    });
    await handler.createInstalmentSchedule(input, 'BRQ1', client as never);
    expect(
      client.instalmentSchedules.createWithSchedule,
    ).not.toHaveBeenCalled();
    expect(prisma.invoicePaymentLink.updateMany).toHaveBeenCalledWith({
      where: { providerReference: 'BRQ1' },
      data: { linkStatus: 'FAILED' },
    });
    expect(prisma.invoiceInstalmentPlan.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { providerReference: 'BRQ1' },
      }),
    );
  });

  it('ignore les webhooks répétés une fois l’échéancier créé', async () => {
    Reflect.set(handler, 'gocardlessOAuthService', {
      getClientForProviderAccount: jest.fn().mockResolvedValue(client),
    });
    client.billingRequests.find.mockResolvedValue({ status: 'fulfilled' });
    prisma.invoiceInstalmentPlan.findUnique.mockResolvedValue({
      providerScheduledId: 'IS1',
    });
    await handler.handleWebhook({
      id: 'EV1',
      action: 'fulfilled',
      organisation_id: 'ORG1',
      links: { billing_request: 'BRQ1' },
    } as never);
    expect(
      client.instalmentSchedules.createWithSchedule,
    ).not.toHaveBeenCalled();
  });
});
