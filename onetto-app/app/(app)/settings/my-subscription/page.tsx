import SubscriptionPlans from "@/app/components/organisms/SubscriptionPlans";
import { getMySubscriptionServer } from "@/lib/subscription/subscription.server";
import { ShieldCheck } from "lucide-react";

function formatSubscriptionPlan(plan: string | undefined) {
  const labels: Record<string, string> = {
    FREE: "ABONNEMENT GRATUIT",
    STARTER_MONTHLY: "ABONNEMENT STARTER MENSUEL",
    STARTER_YEARLY: "ABONNEMENT STARTER ANNUEL",
    PRO_MONTHLY: "ABONNEMENT PRO MENSUEL",
    PRO_YEARLY: "ABONNEMENT PRO ANNUEL",
  };

  return labels[plan ?? "FREE"] ?? plan ?? "Gratuite";
}

async function SubscriptionPage() {
  const subscriptionResult = await getMySubscriptionServer();
  const subscription = subscriptionResult.ok ? subscriptionResult.data : null;
  const currentPlan = subscription?.subscriptionPlan ?? "FREE";
  const isActive = Boolean(subscription?.isActive);

  return (
    <div className="mx-auto w-full max-w-7xl space-y-8 p-4 sm:p-6 lg:p-8">
      <section className="rounded-2xl border border-zinc-200 bg-white p-5 sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-medium text-zinc-500">Mon abonnement</p>
            <h1 className="mt-1 font-title text-2xl font-semibold text-zinc-900">
              {formatSubscriptionPlan(currentPlan)}
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600">
              {subscription?.willCancelAtPeriodEnd
                ? `Résiliation prévue le ${subscription.canceledAtPeriodEnd ? new Intl.DateTimeFormat("fr-FR").format(new Date(subscription.canceledAtPeriodEnd)) : "à la fin de la période en cours"}.`
                : isActive
                  ? "Votre abonnement est actif. Vous pouvez modifier votre formule à tout moment."
                  : "Vous utilisez actuellement la formule gratuite."}
            </p>
          </div>
          <div className={`inline-flex w-fit items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold ${isActive ? "bg-emerald-50 text-emerald-700" : "bg-zinc-100 text-zinc-700"}`}>
            <span className={`h-2 w-2 rounded-full ${isActive ? "bg-emerald-500" : "bg-zinc-400"}`} aria-hidden="true" />
            {isActive ? "Abonnement actif" : "Formule gratuite"}
          </div>
        </div>
        <div className="mt-5 flex items-start gap-3 rounded-xl border border-primary/10 bg-primary/[0.04] p-4 text-sm text-zinc-700">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
          <p>Vos fonctionnalités sont appliquées à vos entreprises selon la formule choisie. Le paiement est sécurisé par Stripe.</p>
        </div>
      </section>

      {subscriptionResult.ok ? (
        <SubscriptionPlans
          currentPlan={currentPlan}
          pendingPlan={subscription?.pendingSubscriptionPlan ?? null}
          pendingPlanEffectiveAt={subscription?.pendingPlanEffectiveAt ?? null}
        />
      ) : (
        <section className="rounded-2xl border border-zinc-200 bg-white p-6 text-sm text-zinc-600">
          L’abonnement est géré par le propriétaire de l’entreprise.
        </section>
      )}
    </div>
  );
}

export default SubscriptionPage;
