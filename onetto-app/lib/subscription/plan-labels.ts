const subscriptionPlanLabels: Record<string, string> = {
  FREE: "Gratuit",
  STARTER_MONTHLY: "Starter - Mensuel",
  STARTER_YEARLY: "Starter - Annuel",
  PRO_MONTHLY: "Pro - Mensuel",
  PRO_YEARLY: "Pro - Annuel",
};

export function subscriptionPlanLabel(plan: string | null | undefined): string {
  if (!plan) return "Gratuit";
  return subscriptionPlanLabels[plan] ?? plan;
}
