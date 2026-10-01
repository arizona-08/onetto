import Link from "next/link";
import { subscriptionPlanLabel } from "@/lib/subscription/plan-labels";
import { apiServer } from "@/lib/api-server";

type Subscriptions = {
  items: Array<{
    userId: string;
    subscriptionPlan: string;
    isActive: boolean;
    customerId: string | null;
    subscriptionId: string | null;
    pendingSubscriptionPlan: string | null;
    pendingPlanEffectiveAt: string | null;
    user: { firstname: string; lastname: string; email: string };
  }>;
  pagination: { total: number };
};
export default async function AdminSubscriptionsPage() {
  const response = await apiServer<Subscriptions>("api/admin/subscriptions");
  if (!response.ok) return <p>Accès administrateur requis.</p>;
  return (
    <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
      <header className="border-b border-zinc-100 p-5">
        <h2 className="font-title text-lg font-semibold">
          Abonnements ({response.data.pagination.total})
        </h2>
        <p className="mt-1 text-sm text-zinc-500">
          Modifiez l’offre depuis la fiche utilisateur. Les changements payants
          sont traités par Stripe.
        </p>
      </header>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-50 text-zinc-500">
            <tr>
              <th className="p-4">Utilisateur</th>
              <th className="p-4">Plan</th>
              <th className="p-4">Statut</th>
              <th className="p-4">Modification programmée</th>
              <th className="p-4">Stripe</th>
            </tr>
          </thead>
          <tbody>
            {response.data.items.map((subscription) => (
              <tr
                key={subscription.userId}
                className="border-t border-zinc-100"
              >
                <td className="p-4 font-medium">
                  <Link
                    className="hover:text-primary"
                    href={`/admin/users/${subscription.userId}`}
                  >
                    {subscription.user.firstname} {subscription.user.lastname}
                  </Link>
                  <p className="text-xs text-zinc-500">
                    {subscription.user.email}
                  </p>
                </td>
                <td className="p-4">
                  {subscriptionPlanLabel(subscription.subscriptionPlan)}
                </td>
                <td className="p-4">
                  {subscription.isActive ? "Actif" : "Inactif"}
                </td>
                <td className="p-4">
                  {subscription.pendingSubscriptionPlan
                    ? subscriptionPlanLabel(
                        subscription.pendingSubscriptionPlan,
                      )
                    : "—"}
                </td>
                <td className="p-4 font-mono text-xs text-zinc-500">
                  {subscription.subscriptionId ?? "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
