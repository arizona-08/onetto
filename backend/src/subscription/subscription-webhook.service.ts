import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { $Enums } from '@prisma/client';
import Stripe from 'stripe';
import { PrismaService } from 'src/prisma/prisma.service';
import { MailService } from 'src/mail/mail.service';

@Injectable()
export class SubscriptionWebhookService {
  private readonly logger = new Logger(SubscriptionWebhookService.name);
  private readonly stripe: Stripe;

  constructor(
    private readonly prismaService: PrismaService,
    configService: ConfigService,
    private readonly mail: MailService,
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
        const subscription = event.data.object;
        await this.syncSubscription(subscription.id);
        await this.markEventAsProcessed(event.id);
        break;
      }
      case 'invoice.paid': {
        const invoice = event.data.object;
        const subscriptionRef =
          invoice.parent?.subscription_details?.subscription;
        const subscriptionId =
          typeof subscriptionRef === 'string'
            ? subscriptionRef
            : subscriptionRef?.id;

        if (subscriptionId) {
          await this.syncSubscription(subscriptionId);
          if (invoice.billing_reason === 'subscription_update') {
            await this.sendAdminUpgradeConfirmation(invoice.id, subscriptionId);
          }
        } else {
          this.logger.warn(
            `Invoice ${invoice.id} is not attached to a subscription.`,
          );
        }

        await this.markEventAsProcessed(event.id);
        break;
      }
      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        const subscriptionRef =
          invoice.parent?.subscription_details?.subscription;
        const subscriptionId =
          typeof subscriptionRef === 'string'
            ? subscriptionRef
            : subscriptionRef?.id;
        if (subscriptionId) {
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
    const isActive =
      !isCanceled && this.isSubscriptionActive(subscription.status);
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
          pendingSubscriptionPlan:
            isCanceled || pendingPlanWasApplied ? null : undefined,
          pendingPlanEffectiveAt:
            isCanceled || pendingPlanWasApplied ? null : undefined,
          pendingStripeScheduleId:
            isCanceled || pendingPlanWasApplied ? null : undefined,
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

  private async sendAdminUpgradeConfirmation(
    invoiceId: string,
    stripeSubscriptionId: string,
  ): Promise<void> {
    const invoice = await this.stripe.invoices.retrieve(invoiceId);
    if (invoice.status !== 'paid') {
      return;
    }

    const select = {
      id: true,
      previousPlan: true,
      targetPlan: true,
      stripeInvoiceId: true,
      emailSentAt: true,
      user: { select: { firstname: true, email: true } },
    } as const;
    const exactMatch =
      await this.prismaService.adminSubscriptionUpgrade.findUnique({
        where: { stripeInvoiceId: invoice.id },
        select,
      });
    const createdAt = new Date(invoice.created * 1000);
    const fallbackMatch = exactMatch
      ? null
      : await this.prismaService.adminSubscriptionUpgrade.findFirst({
          where: {
            stripeSubscriptionId,
            stripeInvoiceId: null,
            emailSentAt: null,
            createdAt: {
              gte: new Date(createdAt.getTime() - 60 * 60 * 1000),
              lte: new Date(createdAt.getTime() + 2 * 60 * 1000),
            },
          },
          select,
          orderBy: { createdAt: 'desc' },
        });
    const upgrade = exactMatch ?? fallbackMatch;
    if (!upgrade || upgrade.emailSentAt) {
      return;
    }
    if (!exactMatch) {
      const invoiceContainsTargetPlan = invoice.lines.data.some((line) => {
        const price = line.pricing?.price_details?.price;
        const priceId = typeof price === 'string' ? price : price?.id;
        if (!priceId) {
          return false;
        }
        try {
          return (
            this.matchPriceIdToSubscriptionPlan(priceId) === upgrade.targetPlan
          );
        } catch {
          return false;
        }
      });
      if (!invoiceContainsTargetPlan) {
        return;
      }
    }
    if (!invoice.invoice_pdf) {
      throw new Error(`La facture PDF Stripe ${invoice.id} est indisponible.`);
    }

    const claimedAt = new Date();
    const claim = await this.prismaService.adminSubscriptionUpgrade.updateMany({
      where: {
        id: upgrade.id,
        emailSentAt: null,
        OR: [
          { emailSendingAt: null },
          {
            emailSendingAt: {
              lt: new Date(claimedAt.getTime() - 5 * 60 * 1000),
            },
          },
        ],
      },
      data: {
        stripeInvoiceId: invoice.id,
        emailSendingAt: claimedAt,
      },
    });
    if (claim.count !== 1) {
      throw new Error(
        `Le mail de la facture ${invoice.id} est déjà en cours d’envoi.`,
      );
    }

    try {
      const pdf = await this.downloadInvoicePdf(invoice.invoice_pdf);
      const content = this.mail.createAdminUpgradeSuccessMail({
        firstname: upgrade.user.firstname,
        previousPlan: upgrade.previousPlan,
        targetPlan: upgrade.targetPlan,
        invoiceNumber: invoice.number,
        totalInCents: invoice.total,
        currency: invoice.currency,
        invoicePdfUrl: invoice.invoice_pdf,
      });
      const filename = (invoice.number ?? invoice.id).replace(
        /[^a-zA-Z0-9_-]/g,
        '-',
      );
      await this.mail.sendMail({
        to: upgrade.user.email,
        ...content,
        attachments: [
          {
            filename: `facture-${filename}.pdf`,
            content: pdf,
            contentType: 'application/pdf',
          },
        ],
      });
      await this.prismaService.adminSubscriptionUpgrade.update({
        where: { id: upgrade.id },
        data: { emailSentAt: new Date(), emailSendingAt: null },
      });
    } catch (error) {
      await this.prismaService.adminSubscriptionUpgrade.updateMany({
        where: {
          id: upgrade.id,
          emailSendingAt: claimedAt,
          emailSentAt: null,
        },
        data: { emailSendingAt: null },
      });
      throw error;
    }
  }

  private async downloadInvoicePdf(url: string): Promise<Buffer> {
    const parsedUrl = new URL(url);
    if (
      parsedUrl.protocol !== 'https:' ||
      !parsedUrl.hostname.endsWith('.stripe.com')
    ) {
      throw new Error('URL de facture Stripe invalide.');
    }
    const response = await fetch(url, {
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) {
      throw new Error(
        `Téléchargement de la facture Stripe impossible : ${response.status}.`,
      );
    }
    const contentLength = Number(response.headers.get('content-length'));
    if (contentLength > 10 * 1024 * 1024) {
      throw new Error(
        'La facture Stripe dépasse la taille maximale autorisée.',
      );
    }
    const pdf = Buffer.from(await response.arrayBuffer());
    if (pdf.length > 10 * 1024 * 1024) {
      throw new Error(
        'La facture Stripe dépasse la taille maximale autorisée.',
      );
    }
    if (pdf.subarray(0, 4).toString() !== '%PDF') {
      throw new Error('Le document Stripe reçu n’est pas un PDF valide.');
    }
    return pdf;
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
