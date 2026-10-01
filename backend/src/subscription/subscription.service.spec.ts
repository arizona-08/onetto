import { BadRequestException } from '@nestjs/common';
import { SubscriptionPlan } from '@prisma/client';
import { SubscriptionService } from './subscription.service';

describe('SubscriptionService — modification admin', () => {
  const prisma = {
    userSubscription: {
      findUnique: jest.fn(),
    },
  };
  const config = {
    getOrThrow: jest.fn(() => 'sk_test_example'),
    get: jest.fn((key: string) => {
      if (key === 'STRIPE_PRO_MONTHLY_PRICE_ID') {
        return 'price_pro_monthly';
      }
      return undefined;
    }),
  };
  const planAccess = {
    getUserAccess: jest.fn(),
    assertCanSchedulePlanChange: jest.fn(),
  };
  const service = new SubscriptionService(
    prisma as never,
    config as never,
    planAccess as never,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('prépare le changement payant avec le tarif Stripe configuré', async () => {
    prisma.userSubscription.findUnique.mockResolvedValue(null);
    const checkout = jest.spyOn(service, 'createCheckoutSession');
    checkout.mockResolvedValue({ url: 'https://checkout.stripe.test/session' });

    await expect(
      service.changePlanForAdmin('user-1', SubscriptionPlan.PRO_MONTHLY),
    ).resolves.toEqual({ url: 'https://checkout.stripe.test/session' });
    expect(planAccess.assertCanSchedulePlanChange).toHaveBeenCalledWith(
      'user-1',
      SubscriptionPlan.PRO_MONTHLY,
    );
    expect(checkout).toHaveBeenCalledWith('price_pro_monthly', 'user-1');
    checkout.mockRestore();
  });

  it('programme le passage au gratuit dans Stripe', async () => {
    prisma.userSubscription.findUnique.mockResolvedValue(null);
    const scheduleFree = jest.spyOn(service, 'scheduleFreePlan');
    const effectiveAt = new Date();
    scheduleFree.mockResolvedValue({
      scheduled: true,
      effectiveAt,
    });

    await expect(
      service.changePlanForAdmin('user-1', SubscriptionPlan.FREE),
    ).resolves.toEqual({ scheduled: true, effectiveAt });
    expect(scheduleFree).toHaveBeenCalledWith('user-1');
    scheduleFree.mockRestore();
  });

  it('refuse un second changement lorsqu’une modification est déjà programmée', async () => {
    prisma.userSubscription.findUnique.mockResolvedValue({
      pendingSubscriptionPlan: SubscriptionPlan.FREE,
    });

    await expect(
      service.changePlanForAdmin('user-1', SubscriptionPlan.PRO_MONTHLY),
    ).rejects.toThrow(BadRequestException);
  });
});
