import { apiServer } from '../api-server';

export type UserSubscription = {
  subscriptionPlan: string;
  isActive: boolean;
  canceledAtPeriodEnd: string | null;
  willCancelAtPeriodEnd: boolean;
};

export function getMySubscriptionServer() {
  return apiServer<UserSubscription | null>('api/subscriptions/me');
}
