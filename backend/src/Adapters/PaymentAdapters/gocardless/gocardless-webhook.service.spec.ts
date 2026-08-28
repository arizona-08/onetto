jest.mock('./gocardless-oauth.service', () => ({
  GoCardlessOAuthService: class GoCardlessOAuthService {},
}));

import { GoCardlessWebhookService } from './gocardless-webhook.service';

describe('GoCardlessWebhookService', () => {
  const prisma = {
    processedWebhookEvents: {
      create: jest.fn(),
      delete: jest.fn(),
      findUnique: jest.fn(),
    },
  };
  const billingRequestHandler = { handleWebhook: jest.fn() };
  const schedulesHandler = { handleWebhook: jest.fn() };
  const mandateHandler = { handleWebhook: jest.fn() };
  const paymentHandler = { handleWebhook: jest.fn() };
  let service: GoCardlessWebhookService;

  const webhook = {
    events: [
      {
        id: 'EV1',
        resource_type: 'payments',
        action: 'failed',
        links: { payment: 'PM1' },
      },
    ],
  } as never;

  beforeEach(() => {
    jest.resetAllMocks();
    prisma.processedWebhookEvents.create.mockResolvedValue({ id: 'event-1' });
    service = new GoCardlessWebhookService(
      prisma as never,
      billingRequestHandler as never,
      schedulesHandler as never,
      mandateHandler as never,
      paymentHandler as never,
      paymentHandler as never,
    );
  });

  it('ignore un événement dupliqué avant d’appeler le handler', async () => {
    prisma.processedWebhookEvents.create.mockRejectedValue({ code: 'P2002' });

    await service.redirectWebhookToHandler(webhook);

    expect(paymentHandler.handleWebhook).not.toHaveBeenCalled();
  });

  it('libère le verrou d’idempotence si le handler échoue', async () => {
    paymentHandler.handleWebhook.mockRejectedValue(new Error('temporary failure'));

    await service.redirectWebhookToHandler(webhook);

    expect(prisma.processedWebhookEvents.delete).toHaveBeenCalledWith({
      where: {
        provider_providerEventId: {
          provider: 'GOCARDLESS',
          providerEventId: 'EV1',
        },
      },
    });
  });

  it('route les schedules, sans les confondre avec les paiements', async () => {
    await service.redirectWebhookToHandler({
      events: [{ id: 'EV2', resource_type: 'instalment_schedules', action: 'errored' }],
    } as never);

    expect(schedulesHandler.handleWebhook).toHaveBeenCalled();
    expect(paymentHandler.handleWebhook).not.toHaveBeenCalled();
  });
});
