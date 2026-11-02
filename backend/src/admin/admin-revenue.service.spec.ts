import Stripe from 'stripe';
import { AdminRevenueService } from './admin-revenue.service';

describe('AdminRevenueService', () => {
  const service = new AdminRevenueService({
    getOrThrow: () => 'sk_test_admin_revenue',
  } as never);
  const stripe = (service as unknown as { stripe: Stripe }).stripe;
  const listInvoices = jest.spyOn(stripe.invoices, 'list');

  const invoice = (
    paidAt: string,
    amountPaid: number,
    overrides: Record<string, unknown> = {},
  ) =>
    ({
      currency: 'eur',
      amount_paid: amountPaid,
      parent: { subscription_details: { subscription: 'sub_123' } },
      status_transitions: { paid_at: Date.parse(paidAt) / 1000 },
      ...overrides,
    }) as Stripe.Invoice;

  beforeAll(() => {
    listInvoices.mockReturnValue({
      async *[Symbol.asyncIterator]() {
        await Promise.resolve();
        yield invoice('2026-10-26T12:00:00Z', 1200);
        yield invoice('2026-10-29T09:00:00Z', 3400);
        yield invoice('2026-09-15T09:00:00Z', 5000);
        yield invoice('2026-10-29T09:00:00Z', 0);
        yield invoice('2026-10-29T09:00:00Z', 1500, {
          amount_paid_off_stripe: 1500,
        });
        yield invoice('2026-10-29T09:00:00Z', 9999, { parent: null });
        yield invoice('2026-10-29T09:00:00Z', 9999, { currency: 'usd' });
      },
    } as never);
  });

  it('compte uniquement les paiements Stripe d’abonnement en EUR de la semaine', async () => {
    const result = await service.revenue(
      'week',
      new Date('2026-10-29T12:00:00Z'),
    );

    expect(result.totalCents).toBe(4600);
    expect(result.points).toHaveLength(4);
    expect(result.points.map((point) => point.amountCents)).toEqual([
      1200, 0, 0, 3400,
    ]);
  });

  it('regroupe le mois par jour et l’année par mois sans relire Stripe', async () => {
    const now = new Date('2026-10-29T12:00:00Z');
    const month = await service.revenue('month', now);
    const year = await service.revenue('year', now);

    expect(month.totalCents).toBe(4600);
    expect(month.points).toHaveLength(29);
    expect(year.totalCents).toBe(9600);
    expect(year.points).toHaveLength(10);
    expect(listInvoices).toHaveBeenCalledTimes(1);
  });
});
