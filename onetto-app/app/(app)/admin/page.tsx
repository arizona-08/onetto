import Link from "next/link";
import { Suspense } from "react";
import { subscriptionPlanLabel } from "@/lib/subscription/plan-labels";
import { apiServer } from "@/lib/api-server";
import AdminRevenueChart from "./AdminRevenueChart";

type Period = "week" | "month" | "year";
type Dashboard = {
  users: number;
  owners: number;
  employees: number;
  activeCompanies: number;
  failedPayments: number;
  subscriptions: Array<{ subscriptionPlan: string; _count: number }>;
};
type Revenue = {
  period: Period;
  currency: "EUR";
  totalCents: number;
  points: Array<{ label: string; amountCents: number }>;
};

const periods: Array<{ value: Period; label: string }> = [
  { value: "week", label: "Semaine" },
  { value: "month", label: "Mois" },
  { value: "year", label: "Année" },
];

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const requestedPeriod = (await searchParams).period;
  const period: Period =
    requestedPeriod === "week" || requestedPeriod === "month"
      ? requestedPeriod
      : "year";
  const dashboard = await apiServer<Dashboard>("api/admin/dashboard");
  if (!dashboard.ok)
    return (
      <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
        Accès administrateur requis.
      </p>
    );

  const metrics = [
    ["Utilisateurs", dashboard.data.users],
    ["Propriétaires", dashboard.data.owners],
    ["Employés", dashboard.data.employees],
    ["Entreprises actives", dashboard.data.activeCompanies],
    ["Paiements en échec", dashboard.data.failedPayments],
  ];
  return (
    <div className="space-y-6">
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {metrics.map(([label, value]) => (
          <article
            key={String(label)}
            className="rounded-2xl border border-zinc-200 bg-white p-5"
          >
            <p className="text-sm text-zinc-500">{label}</p>
            <p className="mt-2 font-title text-3xl font-semibold text-zinc-900">
              {value}
            </p>
          </article>
        ))}
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-5">
        <h2 className="font-title text-lg font-semibold">Abonnements</h2>
        <div className="mt-4 flex flex-wrap gap-3">
          {dashboard.data.subscriptions.map((item) => (
            <span
              key={item.subscriptionPlan}
              className="rounded-lg bg-primary/10 px-3 py-2 text-sm font-semibold text-primary"
            >
              {subscriptionPlanLabel(item.subscriptionPlan)} · {item._count}
            </span>
          ))}
        </div>
      </section>

      <section className="min-w-0 rounded-2xl border border-zinc-200 bg-white p-4 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="font-title text-lg font-semibold text-zinc-900">
              Chiffre d’affaires des abonnements
            </h2>
            <p className="mt-1 text-sm text-zinc-500">
              Factures d’abonnement payées via Stripe, en EUR.
            </p>
          </div>
          <nav
            aria-label="Période du chiffre d’affaires"
            className="flex w-full rounded-xl bg-zinc-100 p-1 sm:w-auto"
          >
            {periods.map((item) => (
              <Link
                key={item.value}
                href={`/admin?period=${item.value}`}
                aria-current={period === item.value ? "page" : undefined}
                className={`flex-1 rounded-lg px-3 py-2 text-center text-sm font-medium transition-colors sm:flex-none ${
                  period === item.value
                    ? "bg-white text-primary shadow-sm"
                    : "text-zinc-600 hover:text-zinc-900"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        <Suspense
          key={period}
          fallback={
            <div role="status" className="mt-6 h-72 animate-pulse rounded-xl bg-zinc-100 p-4 text-sm text-zinc-500">
              Chargement du chiffre d’affaires…
            </div>
          }
        >
          <RevenueDetails period={period} />
        </Suspense>
      </section>
    </div>
  );
}

async function RevenueDetails({ period }: { period: Period }) {
  const revenue = await apiServer<Revenue>(
    `api/admin/dashboard/revenue?period=${period}`,
  );
  if (!revenue.ok) {
    return (
      <p className="mt-6 rounded-xl bg-amber-50 p-4 text-sm text-amber-900">
        Le chiffre d’affaires est temporairement indisponible. Réessayez dans
        quelques instants.
      </p>
    );
  }
  const periodDescription = {
    week: "depuis lundi",
    month: "depuis le début du mois",
    year: "depuis le début de l’année",
  }[period];

  return (
    <>
      <div className="mt-6 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <p className="font-title text-3xl font-semibold text-zinc-900 sm:text-4xl">
          {new Intl.NumberFormat("fr-FR", {
            style: "currency",
            currency: revenue.data.currency,
          }).format(revenue.data.totalCents / 100)}
        </p>
        <span className="text-sm text-zinc-500">{periodDescription}</span>
      </div>
      <div className="mt-6 h-64 min-w-0 sm:h-80">
        <AdminRevenueChart points={revenue.data.points} />
      </div>
      {revenue.data.totalCents === 0 && (
        <p className="mt-3 text-center text-sm text-zinc-500">
          Aucun abonnement encaissé sur cette période.
        </p>
      )}
      <p className="mt-4 text-xs text-zinc-500">
        Montants TTC encaissés, hors remboursements. Dates en UTC. Données
        actualisées toutes les 5 minutes.
      </p>
    </>
  );
}
