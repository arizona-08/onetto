import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from 'src/prisma/prisma.service';
import Stripe from 'stripe';

@Injectable()
export class SubscriptionService {
  private stripe: Stripe;

  constructor(
    private readonly prismaService: PrismaService,
    private readonly configService: ConfigService,
  ) {
    this.stripe = new Stripe(
      this.configService.getOrThrow<string>('STRIPE_SECRET_KEY'),
    );
  }

  async getSubscriptionForUser(userId: string) {
    return this.prismaService.userSubscription.findUnique({
      where: { userId },
      select: {
        subscriptionPlan: true,
        isActive: true,
        canceledAtPeriodEnd: true,
        willCancelAtPeriodEnd: true,
      },
    });
  }

  async createCheckoutSession(planProductId: string, userId: string) {
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
}
