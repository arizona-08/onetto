import { $Enums } from '@prisma/client';

export type PlanTier = 'FREE' | 'STARTER' | 'PRO';
export type BillingInterval = 'NONE' | 'MONTHLY' | 'YEARLY';
export type PlanChangeType =
  | 'UPGRADE'
  | 'DOWNGRADE'
  | 'SAME_TIER_INTERVAL_CHANGE'
  | 'SAME_PLAN';

export function getPlanTier(
  plan: $Enums.SubscriptionPlan | null | undefined,
): PlanTier {
  if (plan === 'STARTER_MONTHLY' || plan === 'STARTER_YEARLY') return 'STARTER';
  if (plan === 'PRO_MONTHLY' || plan === 'PRO_YEARLY') return 'PRO';
  return 'FREE';
}

export function getBillingInterval(
  plan: $Enums.SubscriptionPlan | null | undefined,
): BillingInterval {
  if (plan === 'STARTER_MONTHLY' || plan === 'PRO_MONTHLY') return 'MONTHLY';
  if (plan === 'STARTER_YEARLY' || plan === 'PRO_YEARLY') return 'YEARLY';
  return 'NONE';
}

export function getPlanChangeType(
  current: $Enums.SubscriptionPlan,
  target: $Enums.SubscriptionPlan,
): PlanChangeType {
  if (current === target) return 'SAME_PLAN';
  const tiers: Record<PlanTier, number> = { FREE: 0, STARTER: 1, PRO: 2 };
  const currentTier = getPlanTier(current);
  const targetTier = getPlanTier(target);
  if (tiers[targetTier] > tiers[currentTier]) return 'UPGRADE';
  if (tiers[targetTier] < tiers[currentTier]) return 'DOWNGRADE';
  return 'SAME_TIER_INTERVAL_CHANGE';
}
