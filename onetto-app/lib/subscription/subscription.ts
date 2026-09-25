import { apiClient } from "../api";

export async function getCheckoutSession(planProductId: string) {
  return apiClient<{url?: string; scheduled?: boolean; unchanged?: boolean; pendingPayment?: boolean; message?: string}>(`api/subscriptions/checkout-session`, {
    method: "POST",
    body: JSON.stringify({ planProductId }),
  })
}

export async function scheduleFreePlan() {
  return apiClient<{ scheduled: boolean; effectiveAt: string }>('api/subscriptions/schedule-free', { method: 'POST' });
}

export async function cancelPendingPlanChange() {
  return apiClient<{ canceled: boolean }>('api/subscriptions/cancel-pending-change', { method: 'POST' });
}
