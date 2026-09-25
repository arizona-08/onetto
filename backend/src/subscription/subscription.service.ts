import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from 'src/prisma/prisma.service';
import { PlanAccessService } from 'src/plan-access/plan-access.service';
import Stripe from 'stripe';
import {
  getBillingInterval,
  getPlanChangeType,
} from './subscription-plan.utils';
import { $Enums } from '@prisma/client';

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
    const [subscription, access] = await Promise.all([
      this.prismaService.userSubscription.findUnique({
      where: { userId },
      select: {
        subscriptionPlan: true,
        isActive: true,
        canceledAtPeriodEnd: true,
        willCancelAtPeriodEnd: true,
        pendingSubscriptionPlan: true,
        pendingPlanEffectiveAt: true,
      },
      }),
      this.planAccessService.getUserAccess(userId),
    ]);

    return { ...subscription, ...access };
  }

  async createCheckoutSession(planProductId: string, userId: string) {
    await this.planAccessService.getUserAccess(userId);
    const targetPlan = this.matchPriceIdToSubscriptionPlan(planProductId);
    const existingSubscription = await this.prismaService.userSubscription.findUnique({
      where: { userId },
      select: { subscriptionId: true, subscriptionPlan: true, isActive: true },
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

    const session = await this.stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [
        {
          price: planProductId,
          quantity: 1,
        },
      ],
      metadata: {
        userId: userId,
      },
      subscription_data: {
        metadata: {
          userId: userId,
        },
      },
      success_url: `${frontendUrl}/subscription/success`,
    });
    return { url: session.url };
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
    current: { subscriptionId: string | null; subscriptionPlan: $Enums.SubscriptionPlan; isActive: boolean },
    targetPlan: $Enums.SubscriptionPlan,
    targetPriceId: string,
  ) {
    const changeType = getPlanChangeType(current.subscriptionPlan, targetPlan);
    if (changeType === 'SAME_PLAN') return { unchanged: true };
    if (changeType === 'DOWNGRADE' || changeType === 'SAME_TIER_INTERVAL_CHANGE') {
      await this.planAccessService.assertCanSchedulePlanChange(userId, targetPlan);
      return this.schedulePlanChange(current.subscriptionId!, targetPlan, targetPriceId, userId);
    }

    const stripeSubscription = await this.stripe.subscriptions.retrieve(current.subscriptionId!);
    const item = stripeSubscription.items.data[0];
    if (!item) throw new Error('La souscription Stripe ne contient aucune offre.');
    const updated = await this.stripe.subscriptions.update(current.subscriptionId!, {
      items: [{ id: item.id, price: targetPriceId, quantity: item.quantity ?? 1 }],
      proration_behavior: 'always_invoice',
      payment_behavior: 'pending_if_incomplete',
      expand: ['latest_invoice.payment_intent'],
    });
    // Stripe webhooks are the only authority that can activate the new plan.
    return {
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
    if (!currentPhase) throw new Error('Stripe ne retourne pas la période en cours.');
    const subscription = await this.stripe.subscriptions.retrieve(subscriptionId);
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
            interval: getBillingInterval(targetPlan) === 'YEARLY' ? 'year' : 'month',
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
    if (!periodEnd) throw new Error('Stripe ne retourne pas la fin de période.');
    return new Date(periodEnd * 1000);
  }

  private matchPriceIdToSubscriptionPlan(priceId: string): $Enums.SubscriptionPlan {
    switch (priceId) {
      case process.env.STRIPE_STARTER_MONTHLY_PRICE_ID: return 'STARTER_MONTHLY';
      case process.env.STRIPE_STARTER_YEARLY_PRICE_ID: return 'STARTER_YEARLY';
      case process.env.STRIPE_PRO_MONTHLY_PRICE_ID: return 'PRO_MONTHLY';
      case process.env.STRIPE_PRO_YEARLY_PRICE_ID: return 'PRO_YEARLY';
      default: throw new Error('Offre Stripe inconnue.');
    }
  }
}
