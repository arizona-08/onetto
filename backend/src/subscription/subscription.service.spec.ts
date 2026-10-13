import { BadRequestException } from '@nestjs/common';
import { SubscriptionPlan } from '@prisma/client';
import Stripe from 'stripe';
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

describe('SubscriptionService — remise d’invitation', () => {
  const prisma = {
    userSubscription: { findUnique: jest.fn() },
    adminUserInvitation: { findFirst: jest.fn(), update: jest.fn() },
  };
  const config = { getOrThrow: jest.fn(() => 'http://localhost:3000') };
  const access = { getUserAccess: jest.fn() };
  const service = new SubscriptionService(
    prisma as never,
    config as never,
    access as never,
  );
  const stripe = {
    prices: { retrieve: jest.fn() },
    coupons: { create: jest.fn(), retrieve: jest.fn() },
    checkout: { sessions: { create: jest.fn() } },
  };
  const previousPriceId = process.env.STRIPE_PRO_MONTHLY_PRICE_ID;
  const previousStarterPriceId = process.env.STRIPE_STARTER_MONTHLY_PRICE_ID;

  beforeAll(() => {
    process.env.STRIPE_PRO_MONTHLY_PRICE_ID = 'price_pro_monthly';
    process.env.STRIPE_STARTER_MONTHLY_PRICE_ID = 'price_starter_monthly';
    Reflect.set(service, 'stripe', stripe);
  });

  afterAll(() => {
    if (previousPriceId === undefined) {
      delete process.env.STRIPE_PRO_MONTHLY_PRICE_ID;
    } else {
      process.env.STRIPE_PRO_MONTHLY_PRICE_ID = previousPriceId;
    }
    if (previousStarterPriceId === undefined) {
      delete process.env.STRIPE_STARTER_MONTHLY_PRICE_ID;
    } else {
      process.env.STRIPE_STARTER_MONTHLY_PRICE_ID = previousStarterPriceId;
    }
  });

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.userSubscription.findUnique.mockResolvedValue(null);
    prisma.adminUserInvitation.findFirst.mockResolvedValue({
      id: 'inv-1',
      email: 'ada@example.test',
      subscriptionPlan: SubscriptionPlan.PRO_MONTHLY,
      discountPercent: 40,
      stripeCouponId: null,
    });
    stripe.coupons.create.mockResolvedValue({ id: 'coupon-1' });
    stripe.coupons.retrieve.mockResolvedValue({ id: 'coupon-1', valid: true });
    stripe.prices.retrieve.mockResolvedValue({ product: 'prod_pro' });
    stripe.checkout.sessions.create.mockResolvedValue({
      url: 'https://checkout.stripe.test/session',
    });
  });

  it('présente l’offre invitée sans exposer l’identifiant Stripe', async () => {
    prisma.userSubscription.findUnique.mockResolvedValue({
      subscriptionId: null,
      subscriptionPlan: SubscriptionPlan.FREE,
      isActive: true,
      canceledAtPeriodEnd: null,
      willCancelAtPeriodEnd: false,
      pendingSubscriptionPlan: null,
      pendingPlanEffectiveAt: null,
    });
    access.getUserAccess.mockResolvedValue({ currentPlan: 'FREE' });
    prisma.adminUserInvitation.findFirst.mockResolvedValueOnce({
      subscriptionPlan: SubscriptionPlan.PRO_MONTHLY,
      discountPercent: 40,
    });

    const result = await service.getSubscriptionForUser('user-1');

    expect(result.invitationOffer).toEqual({
      subscriptionPlan: SubscriptionPlan.PRO_MONTHLY,
      discountPercent: 40,
    });
    expect(result).not.toHaveProperty('subscriptionId');
    const invitationCalls = prisma.adminUserInvitation.findFirst.mock
      .calls as Array<
      [{ where: { subscriptionPlan: { not: SubscriptionPlan } } }]
    >;
    const invitationQuery = invitationCalls[0][0];
    expect(invitationQuery.where.subscriptionPlan.not).toBe(
      SubscriptionPlan.FREE,
    );
  });

  it('applique un coupon récurrent à usage unique au Checkout invité', async () => {
    await expect(
      service.createCheckoutSession('price_pro_monthly', 'user-1'),
    ).resolves.toEqual({ url: 'https://checkout.stripe.test/session' });

    expect(stripe.coupons.create).toHaveBeenCalledWith(
      expect.objectContaining({
        percent_off: 40,
        duration: 'forever',
        max_redemptions: 1,
        applies_to: { products: ['prod_pro'] },
      }),
      { idempotencyKey: 'admin-invitation-coupon-inv-1' },
    );
    expect(stripe.checkout.sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: 'subscription',
        customer_email: 'ada@example.test',
        discounts: [{ coupon: 'coupon-1' }],
        subscription_data: {
          metadata: { userId: 'user-1', adminInvitationId: 'inv-1' },
        },
      }),
    );
  });

  it('applique aussi la remise à une invitation Starter', async () => {
    prisma.adminUserInvitation.findFirst.mockResolvedValue({
      id: 'inv-starter',
      email: 'ada@example.test',
      subscriptionPlan: SubscriptionPlan.STARTER_MONTHLY,
      discountPercent: 15,
      stripeCouponId: null,
    });
    stripe.prices.retrieve.mockResolvedValue({ product: 'prod_starter' });

    await service.createCheckoutSession('price_starter_monthly', 'user-1');

    expect(stripe.coupons.create).toHaveBeenCalledWith(
      expect.objectContaining({
        percent_off: 15,
        applies_to: { products: ['prod_starter'] },
      }),
      { idempotencyKey: 'admin-invitation-coupon-inv-starter' },
    );
  });

  it('réutilise un coupon encore valide', async () => {
    prisma.adminUserInvitation.findFirst.mockResolvedValue({
      id: 'inv-1',
      email: 'ada@example.test',
      discountPercent: 40,
      stripeCouponId: 'coupon-existing',
    });
    stripe.coupons.retrieve.mockResolvedValue({
      id: 'coupon-existing',
      valid: true,
    });

    await service.createCheckoutSession('price_pro_monthly', 'user-1');

    expect(stripe.coupons.create).not.toHaveBeenCalled();
    expect(stripe.prices.retrieve).not.toHaveBeenCalled();
    expect(stripe.checkout.sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        discounts: [{ coupon: 'coupon-existing' }],
      }),
    );
  });

  it('remplace un coupon expiré avant de créer le Checkout', async () => {
    prisma.adminUserInvitation.findFirst.mockResolvedValue({
      id: 'inv-1',
      email: 'ada@example.test',
      discountPercent: 40,
      stripeCouponId: 'coupon-expired',
    });
    stripe.coupons.retrieve.mockResolvedValue({
      id: 'coupon-expired',
      valid: false,
    });
    stripe.coupons.create.mockResolvedValue({ id: 'coupon-replacement' });

    await service.createCheckoutSession('price_pro_monthly', 'user-1');

    expect(stripe.coupons.create).toHaveBeenCalledWith(
      expect.objectContaining({
        percent_off: 40,
        duration: 'forever',
        max_redemptions: 1,
      }),
      {
        idempotencyKey: 'admin-invitation-coupon-inv-1-replace-coupon-expired',
      },
    );
    expect(prisma.adminUserInvitation.update).toHaveBeenCalledWith({
      where: { id: 'inv-1' },
      data: { stripeCouponId: 'coupon-replacement' },
    });
    expect(stripe.checkout.sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        discounts: [{ coupon: 'coupon-replacement' }],
      }),
    );
  });

  it('remplace un coupon supprimé chez Stripe', async () => {
    prisma.adminUserInvitation.findFirst.mockResolvedValue({
      id: 'inv-1',
      email: 'ada@example.test',
      discountPercent: 40,
      stripeCouponId: 'coupon-deleted',
    });
    stripe.coupons.retrieve.mockRejectedValue(
      new Stripe.errors.StripeInvalidRequestError({
        code: 'resource_missing',
        message: 'No such coupon',
      }),
    );
    stripe.coupons.create.mockResolvedValue({ id: 'coupon-replacement' });

    await service.createCheckoutSession('price_pro_monthly', 'user-1');

    expect(stripe.coupons.create).toHaveBeenCalledWith(expect.any(Object), {
      idempotencyKey: 'admin-invitation-coupon-inv-1-replace-coupon-deleted',
    });
  });

  it('réessaie une seule fois si Stripe expire le coupon pendant le Checkout', async () => {
    prisma.adminUserInvitation.findFirst.mockResolvedValue({
      id: 'inv-1',
      email: 'ada@example.test',
      discountPercent: 40,
      stripeCouponId: 'coupon-existing',
    });
    stripe.coupons.retrieve.mockResolvedValue({
      id: 'coupon-existing',
      valid: true,
    });
    stripe.coupons.create.mockResolvedValue({ id: 'coupon-replacement' });
    stripe.checkout.sessions.create
      .mockRejectedValueOnce(
        new Stripe.errors.StripeInvalidRequestError({
          code: 'coupon_expired',
          message: 'Coupon expired',
        }),
      )
      .mockResolvedValueOnce({ url: 'https://checkout.stripe.test/retry' });

    await expect(
      service.createCheckoutSession('price_pro_monthly', 'user-1'),
    ).resolves.toEqual({ url: 'https://checkout.stripe.test/retry' });

    const checkoutCalls = stripe.checkout.sessions.create.mock.calls as Array<
      [{ discounts: Array<{ coupon: string }> }]
    >;
    expect(checkoutCalls).toHaveLength(2);
    expect(checkoutCalls[0][0].discounts[0].coupon).toBe('coupon-existing');
    expect(checkoutCalls[1][0].discounts[0].coupon).toBe('coupon-replacement');
  });

  it('ne remplace pas le coupon pour une autre erreur Stripe', async () => {
    prisma.adminUserInvitation.findFirst.mockResolvedValue({
      id: 'inv-1',
      email: 'ada@example.test',
      discountPercent: 40,
      stripeCouponId: 'coupon-existing',
    });
    stripe.checkout.sessions.create.mockRejectedValue(
      new Stripe.errors.StripeInvalidRequestError({
        code: 'parameter_invalid_empty',
        message: 'Invalid parameter',
      }),
    );

    await expect(
      service.createCheckoutSession('price_pro_monthly', 'user-1'),
    ).rejects.toThrow('Invalid parameter');

    expect(stripe.coupons.create).not.toHaveBeenCalled();
    expect(stripe.checkout.sessions.create).toHaveBeenCalledTimes(1);
  });

  it('ne crée pas de remise sans invitation éligible', async () => {
    prisma.adminUserInvitation.findFirst.mockResolvedValue(null);

    await service.createCheckoutSession('price_pro_monthly', 'user-1');

    expect(stripe.coupons.create).not.toHaveBeenCalled();
    const checkoutCalls = stripe.checkout.sessions.create.mock.calls as Array<
      [Record<string, unknown>]
    >;
    const checkoutInput = checkoutCalls[0][0];
    expect(checkoutInput).not.toHaveProperty('discounts');
  });
});
