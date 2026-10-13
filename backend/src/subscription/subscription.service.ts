import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from 'src/prisma/prisma.service';
import { PlanAccessService } from 'src/plan-access/plan-access.service';
import Stripe from 'stripe';
import {
  getBillingInterval,
  getPlanChangeType,
} from './subscription-plan.utils';
import { $Enums, AdminUserInvitation } from '@prisma/client';

@Injectable()
export class SubscriptionService {
  private stripe: Stripe;

  constructor(
    private readonly prismaService: PrismaService,
    private readonly configService: ConfigService,
    private readonly planAccessService: PlanAccessService,
  ) {
    this.stripe = new Stripe(
      this.configService.getOrThrow<string>('STRIPE_SECRET_KEY'),
    );
  }

  async getSubscriptionForUser(userId: string) {
    const [subscription, access, invitation] = await Promise.all([
      this.prismaService.userSubscription.findUnique({
        where: { userId },
        select: {
          subscriptionId: true,
          subscriptionPlan: true,
          isActive: true,
          canceledAtPeriodEnd: true,
          willCancelAtPeriodEnd: true,
          pendingSubscriptionPlan: true,
          pendingPlanEffectiveAt: true,
        },
      }),
      this.planAccessService.getUserAccess(userId),
      this.prismaService.adminUserInvitation.findFirst({
        where: {
          userId,
          subscriptionPlan: { not: 'FREE' },
          acceptedAt: { not: null },
          redeemedAt: null,
          expiresAt: { gt: new Date() },
        },
        select: { subscriptionPlan: true, discountPercent: true },
      }),
    ]);

    return {
      subscriptionPlan: subscription?.subscriptionPlan ?? null,
      isActive: subscription?.isActive ?? null,
      canceledAtPeriodEnd: subscription?.canceledAtPeriodEnd ?? null,
      willCancelAtPeriodEnd: subscription?.willCancelAtPeriodEnd ?? null,
      pendingPlanEffectiveAt: subscription?.pendingPlanEffectiveAt ?? null,
      ...access,
      invitationOffer:
        subscription?.subscriptionId && subscription.isActive
          ? null
          : invitation,
    };
  }

  async changePlanForAdmin(
    userId: string,
    targetPlan: $Enums.SubscriptionPlan,
  ) {
    await this.planAccessService.getUserAccess(userId);
    const subscription = await this.prismaService.userSubscription.findUnique({
      where: { userId },
      select: { pendingSubscriptionPlan: true },
    });
    if (subscription?.pendingSubscriptionPlan) {
      throw new BadRequestException(
        'Un changement d’offre est déjà programmé. Annulez-le avant une nouvelle modification.',
      );
    }

    if (targetPlan === 'FREE') {
      return this.scheduleFreePlan(userId);
    }

    await this.planAccessService.assertCanSchedulePlanChange(
      userId,
      targetPlan,
    );
    const priceId = this.priceIdForPlan(targetPlan);
    return this.createCheckoutSession(priceId, userId);
  }

  private priceIdForPlan(plan: $Enums.SubscriptionPlan): string {
    const configKeyByPlan: Partial<Record<$Enums.SubscriptionPlan, string>> = {
      STARTER_MONTHLY: 'STRIPE_STARTER_MONTHLY_PRICE_ID',
      STARTER_YEARLY: 'STRIPE_STARTER_YEARLY_PRICE_ID',
      PRO_MONTHLY: 'STRIPE_PRO_MONTHLY_PRICE_ID',
      PRO_YEARLY: 'STRIPE_PRO_YEARLY_PRICE_ID',
    };
    const configKey = configKeyByPlan[plan];
    const priceId = configKey
      ? this.configService.get<string>(configKey)
      : null;
    if (!priceId) {
      throw new BadRequestException(
        'Le tarif Stripe de cette offre est absent.',
      );
    }
    return priceId;
  }

  async createCheckoutSession(planProductId: string, userId: string) {
    await this.planAccessService.getUserAccess(userId);
    const targetPlan = this.matchPriceIdToSubscriptionPlan(planProductId);
    const existingSubscription =
      await this.prismaService.userSubscription.findUnique({
        where: { userId },
        select: {
          subscriptionId: true,
          subscriptionPlan: true,
          isActive: true,
        },
      });

    if (existingSubscription?.isActive && existingSubscription.subscriptionId) {
      return this.changeExistingSubscription(
        userId,
        existingSubscription,
        targetPlan,
        planProductId,
      );
    }

    const frontendUrl = this.configService.getOrThrow<string>('FRONTEND_URL');

    const invitation = await this.prismaService.adminUserInvitation.findFirst({
      where: {
        userId,
        subscriptionPlan: targetPlan,
        acceptedAt: { not: null },
        redeemedAt: null,
        expiresAt: { gt: new Date() },
      },
      select: {
        id: true,
        email: true,
        subscriptionPlan: true,
        discountPercent: true,
        stripeCouponId: true,
      },
    });
    let couponId = invitation
      ? await this.getInvitationCouponId(invitation, planProductId)
      : null;

    const createSession = (discountCouponId: string | null) =>
      this.stripe.checkout.sessions.create({
        mode: 'subscription',
        ...(invitation ? { customer_email: invitation.email } : {}),
        ...(discountCouponId
          ? { discounts: [{ coupon: discountCouponId }] }
          : {}),
        line_items: [
          {
            price: planProductId,
            quantity: 1,
          },
        ],
        metadata: {
          userId: userId,
          ...(invitation ? { adminInvitationId: invitation.id } : {}),
        },
        subscription_data: {
          metadata: {
            userId: userId,
            ...(invitation ? { adminInvitationId: invitation.id } : {}),
          },
        },
        success_url: `${frontendUrl}/subscriptions/success`,
      });

    try {
      const session = await createSession(couponId);
      return { url: session.url };
    } catch (error) {
      if (
        !invitation ||
        !couponId ||
        !this.isStripeInvalidRequest(error, 'coupon_expired')
      ) {
        throw error;
      }

      couponId = await this.createInvitationCoupon(
        invitation,
        planProductId,
        couponId,
      );
      const session = await createSession(couponId);
      return { url: session.url };
    }
  }

  private async getInvitationCouponId(
    invitation: Pick<
      AdminUserInvitation,
      'id' | 'discountPercent' | 'stripeCouponId'
    >,
    priceId: string,
  ): Promise<string> {
    const existingCouponId = invitation.stripeCouponId;
    if (existingCouponId) {
      try {
        const coupon = await this.stripe.coupons.retrieve(existingCouponId);
        if (coupon.valid) {
          return coupon.id;
        }
      } catch (error) {
        if (!this.isStripeInvalidRequest(error, 'resource_missing')) {
          throw error;
        }
      }
    }

    return this.createInvitationCoupon(invitation, priceId, existingCouponId);
  }

  private async createInvitationCoupon(
    invitation: Pick<AdminUserInvitation, 'id' | 'discountPercent'>,
    priceId: string,
    previousCouponId: string | null,
  ): Promise<string> {
    const price = await this.stripe.prices.retrieve(priceId);
    const productId =
      typeof price.product === 'string' ? price.product : price.product.id;
    const idempotencyKey = previousCouponId
      ? `admin-invitation-coupon-${invitation.id}-replace-${previousCouponId}`
      : `admin-invitation-coupon-${invitation.id}`;
    const coupon = await this.stripe.coupons.create(
      {
        percent_off: invitation.discountPercent,
        duration: 'forever',
        max_redemptions: 1,
        applies_to: { products: [productId] },
        name: `Invitation Onetto ${invitation.discountPercent} %`,
        metadata: { adminInvitationId: invitation.id },
      },
      { idempotencyKey },
    );
    await this.prismaService.adminUserInvitation.update({
      where: { id: invitation.id },
      data: { stripeCouponId: coupon.id },
    });
    return coupon.id;
  }

  private isStripeInvalidRequest(error: unknown, code: string): boolean {
    return (
      error instanceof Stripe.errors.StripeInvalidRequestError &&
      error.code === code
    );
  }

  async scheduleFreePlan(userId: string) {
    const subscription = await this.requireActiveSubscription(userId);
    await this.planAccessService.assertCanSchedulePlanChange(userId, 'FREE');
    const stripeSubscription = await this.stripe.subscriptions.retrieve(
      subscription.subscriptionId,
    );
    const effectiveAt = this.currentPeriodEnd(stripeSubscription);
    await this.stripe.subscriptions.update(subscription.subscriptionId, {
      cancel_at_period_end: true,
      proration_behavior: 'none',
    });
    await this.prismaService.userSubscription.update({
      where: { userId },
      data: {
        pendingSubscriptionPlan: 'FREE',
        pendingPlanEffectiveAt: effectiveAt,
        pendingStripeScheduleId: null,
        willCancelAtPeriodEnd: true,
        canceledAtPeriodEnd: effectiveAt,
      },
    });
    return { scheduled: true, effectiveAt };
  }

  async cancelPendingPlanChange(userId: string) {
    const subscription = await this.prismaService.userSubscription.findUnique({
      where: { userId },
      select: { subscriptionId: true, pendingStripeScheduleId: true },
    });
    if (!subscription?.subscriptionId) return { canceled: false };

    if (subscription.pendingStripeScheduleId) {
      await this.stripe.subscriptionSchedules.release(
        subscription.pendingStripeScheduleId,
      );
    } else {
      await this.stripe.subscriptions.update(subscription.subscriptionId, {
        cancel_at_period_end: false,
      });
    }
    await this.prismaService.userSubscription.update({
      where: { userId },
      data: {
        pendingSubscriptionPlan: null,
        pendingPlanEffectiveAt: null,
        pendingStripeScheduleId: null,
        willCancelAtPeriodEnd: false,
        canceledAtPeriodEnd: null,
      },
    });
    return { canceled: true };
  }

  private async changeExistingSubscription(
    userId: string,
    current: {
      subscriptionId: string | null;
      subscriptionPlan: $Enums.SubscriptionPlan;
      isActive: boolean;
    },
    targetPlan: $Enums.SubscriptionPlan,
    targetPriceId: string,
  ) {
    const changeType = getPlanChangeType(current.subscriptionPlan, targetPlan);
    if (changeType === 'SAME_PLAN') return { unchanged: true };
    if (
      changeType === 'DOWNGRADE' ||
      changeType === 'SAME_TIER_INTERVAL_CHANGE'
    ) {
      await this.planAccessService.assertCanSchedulePlanChange(
        userId,
        targetPlan,
      );
      return this.schedulePlanChange(
        current.subscriptionId!,
        targetPlan,
        targetPriceId,
        userId,
      );
    }

    const stripeSubscription = await this.stripe.subscriptions.retrieve(
      current.subscriptionId!,
    );
    if (stripeSubscription.pending_update) {
      throw new BadRequestException(
        'Un paiement de changement d’offre est déjà en attente sur Stripe.',
      );
    }
    const item = stripeSubscription.items.data[0];
    if (!item) {
      throw new Error('La souscription Stripe ne contient aucune offre.');
    }
    const updated = await this.stripe.subscriptions.update(
      current.subscriptionId!,
      {
        items: [
          { id: item.id, price: targetPriceId, quantity: item.quantity ?? 1 },
        ],
        proration_behavior: 'always_invoice',
        payment_behavior: 'pending_if_incomplete',
        expand: ['latest_invoice.payment_intent'],
      },
    );
    const stripeInvoiceId =
      typeof updated.latest_invoice === 'string'
        ? updated.latest_invoice
        : (updated.latest_invoice?.id ?? null);
    // Stripe webhooks are the only authority that can activate the new plan.
    return {
      stripeInvoiceId,
      pendingPayment: Boolean(updated.pending_update),
      message: updated.pending_update
        ? 'Le changement sera appliqué après confirmation du paiement par Stripe.'
        : 'Le paiement de mise à niveau est en cours de confirmation.',
    };
  }

  private async schedulePlanChange(
    subscriptionId: string,
    targetPlan: $Enums.SubscriptionPlan,
    targetPriceId: string,
    userId: string,
  ) {
    const schedule = await this.stripe.subscriptionSchedules.create({
      from_subscription: subscriptionId,
    });
    const currentPhase = schedule.current_phase ?? schedule.phases[0];
    if (!currentPhase)
      throw new Error('Stripe ne retourne pas la période en cours.');
    const subscription =
      await this.stripe.subscriptions.retrieve(subscriptionId);
    const currentItems = subscription.items.data.map((item) => ({
      price: item.price.id,
      quantity: item.quantity ?? 1,
    }));
    await this.stripe.subscriptionSchedules.update(schedule.id, {
      end_behavior: 'release',
      phases: [
        {
          start_date: currentPhase.start_date,
          end_date: currentPhase.end_date,
          items: currentItems,
          proration_behavior: 'none',
        },
        {
          start_date: currentPhase.end_date,
          items: [{ price: targetPriceId, quantity: 1 }],
          duration: {
            interval:
              getBillingInterval(targetPlan) === 'YEARLY' ? 'year' : 'month',
            interval_count: 1,
          },
          proration_behavior: 'none',
        },
      ],
    });
    const effectiveAt = new Date(currentPhase.end_date * 1000);
    await this.prismaService.userSubscription.update({
      where: { userId },
      data: {
        pendingSubscriptionPlan: targetPlan,
        pendingPlanEffectiveAt: effectiveAt,
        pendingStripeScheduleId: schedule.id,
      },
    });
    return { scheduled: true, effectiveAt };
  }

  private async requireActiveSubscription(userId: string) {
    const subscription = await this.prismaService.userSubscription.findUnique({
      where: { userId },
      select: { subscriptionId: true, isActive: true },
    });
    if (!subscription?.isActive || !subscription.subscriptionId) {
      throw new Error('Aucun abonnement payant actif à modifier.');
    }
    return { subscriptionId: subscription.subscriptionId };
  }

  private currentPeriodEnd(subscription: Stripe.Subscription): Date {
    const periodEnd = subscription.items.data[0]?.current_period_end;
    if (!periodEnd)
      throw new Error('Stripe ne retourne pas la fin de période.');
    return new Date(periodEnd * 1000);
  }

  private matchPriceIdToSubscriptionPlan(
    priceId: string,
  ): $Enums.SubscriptionPlan {
    switch (priceId) {
      case process.env.STRIPE_STARTER_MONTHLY_PRICE_ID:
        return 'STARTER_MONTHLY';
      case process.env.STRIPE_STARTER_YEARLY_PRICE_ID:
        return 'STARTER_YEARLY';
      case process.env.STRIPE_PRO_MONTHLY_PRICE_ID:
        return 'PRO_MONTHLY';
      case process.env.STRIPE_PRO_YEARLY_PRICE_ID:
        return 'PRO_YEARLY';
      default:
        throw new Error('Offre Stripe inconnue.');
    }
  }
}
