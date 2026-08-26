import SubscriptionPlans from "@/app/components/organisms/SubscriptionPlans";
import { getMySubscriptionServer } from "@/lib/subscription/subscription.server";

function formatSubscriptionPlan(plan: string | undefined) {
  const labels: Record<string, string> = {
    FREE: "Gratuite",
    STARTER_MONTHLY: "Starter mensuel",
    STARTER_YEARLY: "Starter annuel",
    PRO_MONTHLY: "Pro mensuel",
    PRO_YEARLY: "Pro annuel",
  };

  return labels[plan ?? "FREE"] ?? plan ?? "Gratuite";
}

async function SubscriptionPage() {
  const subscriptionResult = await getMySubscriptionServer();

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 p-4">
      <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-medium text-zinc-500">Mon abonnement</p>
        <h1 className="mt-1 font-title text-2xl font-black text-zinc-900">
          Formule{" "}
          {formatSubscriptionPlan(
            subscriptionResult.ok
              ? (subscriptionResult.data?.subscriptionPlan as string | undefined)
              : undefined,
          )}
        </h1>
        <p className="mt-2 text-sm text-zinc-600">
          {subscriptionResult.ok &&
          subscriptionResult.data?.willCancelAtPeriodEnd
            ? `Résiliation prévue le ${
                subscriptionResult.data.canceledAtPeriodEnd
                  ? new Intl.DateTimeFormat("fr-FR").format(
                      new Date(subscriptionResult.data.canceledAtPeriodEnd),
                    )
                  : "à la fin de la période en cours"
              }.`
            : subscriptionResult.ok && subscriptionResult.data?.isActive
              ? "Votre abonnement est actif."
              : "Vous utilisez actuellement la formule gratuite."}
        </p>
      </section>

      {subscriptionResult.ok ? (
        <SubscriptionPlans />
      ) : (
        <p className="text-sm text-zinc-500">
          L’abonnement est géré par le propriétaire de l’entreprise.
        </p>
      )}
    </div>
  );
}

export default SubscriptionPage;
