import { apiServer } from '../api-server';

export type UserSubscription = {
  subscriptionPlan: string | null;
  isActive: boolean | null;
  canceledAtPeriodEnd: string | null;
  willCancelAtPeriodEnd: boolean | null;
  pendingSubscriptionPlan: string | null;
  pendingPlanEffectiveAt: string | null;
  currentPlan: 'FREE' | 'STARTER' | 'PRO';
  features: {
    negotiation: boolean;
    instalments: boolean;
    advancedAnalytics: boolean;
    automaticReminders: boolean;
    cashflowForecast: boolean;
  };
  maxOwnedCompanies: number;
};

export function getMySubscriptionServer() {
  return apiServer<UserSubscription | null>('api/subscriptions/me');
}
