import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { $Enums } from '@prisma/client';
import Stripe from 'stripe';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class SubscriptionWebhookService {
  private readonly logger = new Logger(SubscriptionWebhookService.name);
  private readonly stripe: Stripe;

  constructor(
    private readonly prismaService: PrismaService,
    configService: ConfigService,
  ) {
    this.stripe = new Stripe(
      configService.getOrThrow<string>('STRIPE_SECRET_KEY'),
    );
  }

  async handleWebhook(body: unknown): Promise<void> {
    const event = body as Stripe.Event;

    if (await this.isStripeEventProcessed(event.id)) {
      this.logger.warn(
        `Stripe event ${event.id} has already been processed. Skipping.`,
      );
      return;
    }

    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await this.syncSubscription(subscription.id);
        await this.markEventAsProcessed(event.id);
        break;
      }
      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId =
          invoice.parent?.subscription_details?.subscription;

        if (typeof subscriptionId === 'string') {
          await this.syncSubscription(subscriptionId);
        } else {
          this.logger.warn(
            `Invoice ${invoice.id} is not attached to a subscription.`,
          );
        }

        await this.markEventAsProcessed(event.id);
        break;
      }
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = invoice.parent?.subscription_details?.subscription;
        if (typeof subscriptionId === 'string') {
          await this.syncSubscription(subscriptionId);
        }
        await this.markEventAsProcessed(event.id);
        break;
      }
      default:
        this.logger.warn(`Unhandled event type: ${event.type}`);
    }
  }

  /** Synchronise la source Stripe avec les champs de UserSubscription. */
  async syncSubscription(stripeSubscriptionId: string): Promise<void> {
    const subscription =
      await this.stripe.subscriptions.retrieve(stripeSubscriptionId);
    const priceId = subscription.items.data[0]?.price.id;

    if (!priceId) {
      throw new Error(
        `Subscription ${stripeSubscriptionId} has no price item.`,
      );
    }

    const subscriptionPlan = this.matchPriceIdToSubscriptionPlan(priceId);
    const isCanceled = subscription.status === 'canceled';
    const customerId = this.getStripeId(subscription.customer);
    const isActive = !isCanceled && this.isSubscriptionActive(subscription.status);
    const canceledAtPeriodEnd = subscription.cancel_at
      ? new Date(subscription.cancel_at * 1000)
      : subscription.canceled_at
        ? new Date(subscription.canceled_at * 1000)
        : null;

    await this.prismaService.$transaction(async (tx) => {
      const metadataUserId = subscription.metadata.userId;
      // A Stripe subscription can outlive the local user that created its
      // Checkout session. Never use its metadata as a foreign key before
      // checking that the user still exists.
      const [metadataUser, existingSubscription] = await Promise.all([
        metadataUserId
          ? tx.user.findUnique({
              where: { id: metadataUserId },
              select: { id: true, subscriptionPlan: true },
            })
          : null,
        tx.userSubscription.findUnique({ where: { customerId } }),
      ]);
      const userId = metadataUser?.id ?? existingSubscription?.userId;

      if (!userId) {
        this.logger.warn(
          `Ignoring Stripe subscription ${stripeSubscriptionId}: its metadata user ${metadataUserId ?? '(missing)'} does not exist and customer ${customerId} has no local subscription.`,
        );
        return;
      }

      const user =
        metadataUser ??
        (await tx.user.findUnique({
          where: { id: userId },
          select: { id: true, subscriptionPlan: true },
        }));
      if (!user) {
        this.logger.warn(
          `Ignoring Stripe subscription ${stripeSubscriptionId}: local user ${userId} does not exist.`,
        );
        return;
      }

      const existingLocalSubscription = await tx.userSubscription.findUnique({
        where: { userId },
        select: { pendingSubscriptionPlan: true },
      });
      const pendingPlanWasApplied =
        existingLocalSubscription?.pendingSubscriptionPlan === subscriptionPlan;
      const willCancelAtPeriodEnd = !isCanceled && canceledAtPeriodEnd != null;
      await tx.userSubscription.upsert({
        // UserSubscription.userId is the business invariant: one row per user.
        // A price change must update that row even if Stripe's customer changes.
        where: { userId },
        create: {
          userId,
          customerId,
          subscriptionId: subscription.id,
          subscriptionPlan,
          isActive,
          canceledAtPeriodEnd,
          willCancelAtPeriodEnd: willCancelAtPeriodEnd,
          pendingSubscriptionPlan: null,
          pendingPlanEffectiveAt: null,
          pendingStripeScheduleId: null,
        },
        update: {
          subscriptionId: subscription.id,
          subscriptionPlan,
          isActive,
          canceledAtPeriodEnd,
          willCancelAtPeriodEnd: willCancelAtPeriodEnd,
          pendingSubscriptionPlan: isCanceled || pendingPlanWasApplied
            ? null
            : undefined,
          pendingPlanEffectiveAt: isCanceled || pendingPlanWasApplied
            ? null
            : undefined,
          pendingStripeScheduleId: isCanceled || pendingPlanWasApplied
            ? null
            : undefined,
        },
      });

      const userPlan = isActive
        ? subscriptionPlan
        : $Enums.SubscriptionPlan.FREE;

      await tx.user.update({
        where: { id: userId },
        data: { subscriptionPlan: userPlan },
      });

      if (user.subscriptionPlan !== userPlan) {
        await tx.userSubscriptionHistory.create({
          data: { userId, subscriptionPlan: userPlan },
        });
      }
    });
  }

  private getStripeId(value: string | { id: string }): string {
    return typeof value === 'string' ? value : value.id;
  }

  private isSubscriptionActive(status: Stripe.Subscription.Status): boolean {
    return ['active', 'trialing', 'past_due'].includes(status);
  }

  private async markEventAsProcessed(eventId: string): Promise<void> {
    await this.prismaService.processedStripeWebhookEvents.create({
      data: { providerEventId: eventId },
    });
  }

  private async isStripeEventProcessed(eventId: string): Promise<boolean> {
    const processedEvent =
      await this.prismaService.processedStripeWebhookEvents.findUnique({
        where: { providerEventId: eventId },
      });
    return processedEvent !== null;
  }

  private matchPriceIdToSubscriptionPlan(
    priceId: string,
  ): $Enums.SubscriptionPlan {
    switch (priceId) {
      case process.env.STRIPE_STARTER_MONTHLY_PRICE_ID:
        return $Enums.SubscriptionPlan.STARTER_MONTHLY;
      case process.env.STRIPE_STARTER_YEARLY_PRICE_ID:
        return $Enums.SubscriptionPlan.STARTER_YEARLY;
      case process.env.STRIPE_PRO_MONTHLY_PRICE_ID:
        return $Enums.SubscriptionPlan.PRO_MONTHLY;
      case process.env.STRIPE_PRO_YEARLY_PRICE_ID:
        return $Enums.SubscriptionPlan.PRO_YEARLY;
      default:
        throw new Error(`Unknown price ID: ${priceId}`);
    }
  }
}
