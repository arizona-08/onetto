/* eslint-disable @typescript-eslint/no-unsafe-assignment -- Jest matchers are dynamically typed. */
jest.mock('./gocardless-oauth.service', () => ({
  GoCardlessOAuthService: class GoCardlessOAuthService {},
}));

import { GoCardlessWebhookService } from './gocardless-webhook.service';

describe('GoCardlessWebhookService', () => {
  const prisma = {
    processedWebhookEvents: {
      create: jest.fn(),
      deleteMany: jest.fn(),
      findUnique: jest.fn(),
      updateMany: jest.fn(),
    },
  };
  const billingRequestHandler = { handleWebhook: jest.fn() };
  const schedulesHandler = { handleWebhook: jest.fn() };
  const mandateHandler = { handleWebhook: jest.fn() };
  const paymentHandler = { handleWebhook: jest.fn() };
  const oauth = {
    markProviderAccountDisconnectedIfTokenInactive: jest
      .fn()
      .mockResolvedValue(false),
  };
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
    prisma.processedWebhookEvents.updateMany.mockResolvedValue({ count: 1 });
    oauth.markProviderAccountDisconnectedIfTokenInactive.mockResolvedValue(
      false,
    );
    service = new GoCardlessWebhookService(
      prisma as never,
      billingRequestHandler as never,
      schedulesHandler as never,
      mandateHandler as never,
      paymentHandler as never,
      paymentHandler as never,
      oauth as never,
    );
  });

  it('ignore un événement dupliqué avant d’appeler le handler', async () => {
    prisma.processedWebhookEvents.create.mockRejectedValue({ code: 'P2002' });
    prisma.processedWebhookEvents.findUnique.mockResolvedValue({
      completedAt: new Date(),
      claimedAt: new Date(),
    });

    await service.redirectWebhookToHandler(webhook);

    expect(paymentHandler.handleWebhook).not.toHaveBeenCalled();
  });

  it('libère le verrou d’idempotence si le handler échoue', async () => {
    paymentHandler.handleWebhook.mockRejectedValue(
      new Error('temporary failure'),
    );

    await expect(service.redirectWebhookToHandler(webhook)).rejects.toThrow(
      'n’ont pas pu être traités',
    );

    expect(prisma.processedWebhookEvents.deleteMany).toHaveBeenCalledWith({
      where: expect.objectContaining({
        provider: 'GOCARDLESS',
        providerEventId: 'EV1',
        completedAt: null,
      }),
    });
  });

  it('ne traite pas un événement encore réservé et demande un renvoi', async () => {
    prisma.processedWebhookEvents.create.mockRejectedValue({ code: 'P2002' });
    prisma.processedWebhookEvents.findUnique.mockResolvedValue({
      completedAt: null,
      claimedAt: new Date(),
    });
    await expect(service.redirectWebhookToHandler(webhook)).rejects.toThrow(
      'n’ont pas pu être traités',
    );
    expect(paymentHandler.handleWebhook).not.toHaveBeenCalled();
  });

  it('reprend une réservation abandonnée après son expiration', async () => {
    prisma.processedWebhookEvents.create.mockRejectedValue({ code: 'P2002' });
    prisma.processedWebhookEvents.findUnique.mockResolvedValue({
      completedAt: null,
      claimedAt: new Date(Date.now() - 20 * 60_000),
    });
    await service.redirectWebhookToHandler(webhook);
    expect(paymentHandler.handleWebhook).toHaveBeenCalledTimes(1);
    expect(prisma.processedWebhookEvents.updateMany).toHaveBeenCalledTimes(2);
  });

  it('route les schedules, sans les confondre avec les paiements', async () => {
    await service.redirectWebhookToHandler({
      events: [
        { id: 'EV2', resource_type: 'instalment_schedules', action: 'errored' },
      ],
    } as never);

    expect(schedulesHandler.handleWebhook).toHaveBeenCalled();
    expect(paymentHandler.handleWebhook).not.toHaveBeenCalled();
  });
});
