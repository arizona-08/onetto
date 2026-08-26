import { apiClient } from "../api";

export async function getCheckoutSession(planProductId: string) {
  return apiClient<{url: string}>(`api/subscriptions/checkout-session`, {
    method: "POST",
    body: JSON.stringify({ planProductId }),
  })
}