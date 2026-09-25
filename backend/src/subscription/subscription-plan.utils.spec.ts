import {
  getBillingInterval,
  getPlanChangeType,
  getPlanTier,
} from './subscription-plan.utils';

describe('subscription plan helpers', () => {
  it.each([
    ['FREE', 'FREE', 'NONE'],
    ['STARTER_MONTHLY', 'STARTER', 'MONTHLY'],
    ['STARTER_YEARLY', 'STARTER', 'YEARLY'],
    ['PRO_MONTHLY', 'PRO', 'MONTHLY'],
    ['PRO_YEARLY', 'PRO', 'YEARLY'],
  ])('classifies %s', (plan, tier, interval) => {
    expect(getPlanTier(plan as never)).toBe(tier);
    expect(getBillingInterval(plan as never)).toBe(interval);
  });

  it.each([
    ['STARTER_MONTHLY', 'PRO_MONTHLY', 'UPGRADE'],
    ['PRO_YEARLY', 'STARTER_YEARLY', 'DOWNGRADE'],
    ['PRO_MONTHLY', 'PRO_YEARLY', 'SAME_TIER_INTERVAL_CHANGE'],
    ['FREE', 'FREE', 'SAME_PLAN'],
  ])('classifies %s to %s as %s', (current, target, expected) => {
    expect(getPlanChangeType(current as never, target as never)).toBe(expected);
  });
});
