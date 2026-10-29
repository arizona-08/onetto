import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

export type RevenuePeriod = 'week' | 'month' | 'year';

type PaidInvoice = {
  paidAt: number;
  amount: number;
};

@Injectable()
export class AdminRevenueService {
  private readonly stripe: Stripe;
  private cachedInvoices: PaidInvoice[] | null = null;
  private cacheExpiresAt = 0;
  private loadingInvoices: Promise<PaidInvoice[]> | null = null;

  constructor(config: ConfigService) {
    this.stripe = new Stripe(config.getOrThrow<string>('STRIPE_SECRET_KEY'));
  }

  async revenue(period: RevenuePeriod, now = new Date()) {
    const invoices = await this.paidSubscriptionInvoices();
    const year = now.getUTCFullYear();
    const month = now.getUTCMonth();
    const day = now.getUTCDate();
    const today = Date.UTC(year, month, day);
    const start =
      period === 'year'
        ? Date.UTC(year, 0, 1)
        : period === 'month'
          ? Date.UTC(year, month, 1)
          : today - ((now.getUTCDay() + 6) % 7) * 86_400_000;
    const dates: Date[] = [];
    if (period === 'year') {
      for (let index = 0; index <= month; index++) {
        dates.push(new Date(Date.UTC(year, index, 1)));
      }
    } else {
      const days = Math.floor((today - start) / 86_400_000);
      for (let index = 0; index <= days; index++) {
        dates.push(new Date(start + index * 86_400_000));
      }
    }

    const amounts = new Map(
      dates.map((date) => [this.bucket(date, period), 0]),
    );
    const end = now.getTime();
    for (const invoice of invoices) {
      const paidAt = invoice.paidAt * 1000;
      if (paidAt < start || paidAt > end) continue;
      const key = this.bucket(new Date(paidAt), period);
      if (amounts.has(key))
        amounts.set(key, amounts.get(key)! + invoice.amount);
    }

    const formatter = new Intl.DateTimeFormat('fr-FR', {
      timeZone: 'UTC',
      ...(period === 'year'
        ? { month: 'short' as const }
        : { day: 'numeric' as const, month: 'short' as const }),
    });
    const points = dates.map((date) => ({
      label: formatter.format(date),
      amountCents: amounts.get(this.bucket(date, period)) ?? 0,
    }));
    return {
      period,
      currency: 'EUR',
      totalCents: points.reduce((sum, point) => sum + point.amountCents, 0),
      points,
    };
  }

  private bucket(date: Date, period: RevenuePeriod) {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    return period === 'year' ? `${year}-${month}` : `${year}-${month}-${day}`;
  }

  private async paidSubscriptionInvoices(): Promise<PaidInvoice[]> {
    if (this.cachedInvoices && Date.now() < this.cacheExpiresAt) {
      return this.cachedInvoices;
    }
    if (this.loadingInvoices) return this.loadingInvoices;

    this.loadingInvoices = this.loadInvoices();
    try {
      const invoices = await this.loadingInvoices;
      this.cachedInvoices = invoices;
      this.cacheExpiresAt = Date.now() + 5 * 60_000;
      return invoices;
    } finally {
      this.loadingInvoices = null;
    }
  }

  private async loadInvoices(): Promise<PaidInvoice[]> {
    const paid: PaidInvoice[] = [];
    for await (const invoice of this.stripe.invoices.list({
      status: 'paid',
      limit: 100,
    })) {
      const amountCollected = Math.max(
        0,
        invoice.amount_paid - (invoice.amount_paid_off_stripe ?? 0),
      );
      if (
        invoice.currency !== 'eur' ||
        !invoice.parent?.subscription_details?.subscription ||
        !invoice.status_transitions.paid_at ||
        amountCollected <= 0
      ) {
        continue;
      }
      paid.push({
        paidAt: invoice.status_transitions.paid_at,
        amount: amountCollected,
      });
    }
    return paid;
  }
}
