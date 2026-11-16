import Greetings from "@/app/components/atoms/Greetings";
import { Badge } from "@/app/components/ui/Badge";
import { Card } from "@/app/components/ui/Card";
import ProRevenueChart from "@/app/components/organisms/ProRevenueChart";
import StarterRevenueChart from "@/app/components/organisms/StarterRevenueChart";
import {
  getActiveCompanyPlanAccessServer,
  getMyCompaniesServer,
} from "@/lib/companies/companies.server";
import {
  type DashboardSummary,
  type ProDashboard,
  getDashboardSummaryServer,
  getProDashboardServer,
} from "@/lib/documents/document.server";
import { getMySubscriptionServer } from "@/lib/subscription/subscription.server";
import {
  ArrowDownLeft,
  BarChart3,
  BellRing,
  CalendarClock,
  CircleAlert,
  Clock3,
  FileText,
  ReceiptText,
  TrendingUp,
  WalletCards,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import {
  emptyDashboardSummary,
  emptyProDashboard,
} from "./empty-dashboard-data";

const dashboardMainClass =
  "mx-auto w-full max-w-[1500px] px-4 py-6 sm:px-8 sm:py-8 lg:px-10 lg:py-10 2xl:px-12";

function formatCurrency(amount: number) {
  return amount.toLocaleString("fr-FR", { style: "currency", currency: "EUR" });
}

function invoiceLabel(status: string) {
  return (
    {
      PAID: "Payée",
      PAID_MANUALLY: "Payée",
      PENDING: "En attente",
      PAYMENT_IN_PROGRESS: "En cours",
      OVERDUE: "En retard",
      PARTIALLY_PAID: "Partiellement payée",
      REJECTED: "Refusée",
      DRAFT: "Brouillon",
    }[status] ?? status
  );
}

function invoiceTone(status: string) {
  if (status === "PAID" || status === "PAID_MANUALLY")
    return "bg-emerald-50 text-emerald-700";
  if (status === "OVERDUE" || status === "REJECTED")
    return "bg-red-50 text-red-700";
  if (status === "DRAFT") return "bg-ui-subtle text-ui-secondary";
  return "bg-amber-50 text-amber-700";
}

function activityLabel(activity: {
  type: "INVOICE" | "ESTIMATE";
  documentNumber: string | null;
  invoiceStatus: string;
  estimateStatus: string;
}) {
  const number = activity.documentNumber ?? "sans numéro";
  if (activity.type === "INVOICE")
    return `Facture ${number} — ${invoiceLabel(activity.invoiceStatus)}`;
  return `Devis ${number} — ${activity.estimateStatus === "ACCEPTED" ? "accepté" : activity.estimateStatus === "REJECTED" ? "refusé" : "en attente"}`;
}

function DashboardHeader({
  plan,
  description,
}: {
  plan: "Free" | "Starter" | "Pro";
  description: string;
}) {
  return (
    <header className="flex flex-col gap-5 border-b border-ui-border pb-7 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <Greetings />
        <p className="mt-2 text-sm leading-6 text-ui-secondary sm:text-base">{description}</p>
      </div>
      <Badge tone="primary" className="gap-2 border border-ui-primary/15 px-3 py-1.5">
        <BarChart3 className="h-3.5 w-3.5" aria-hidden="true" />
        Tableau de bord {plan}
      </Badge>
    </header>
  );
}

function MetricCard({
  label,
  value,
  hint,
  icon,
  tone = "primary",
}: {
  label: string;
  value: string;
  hint: string;
  icon: ReactNode;
  tone?: "primary" | "success" | "warning" | "danger";
}) {
  const tones = {
    primary: "bg-primary/10 text-primary",
    success: "bg-emerald-50 text-emerald-700",
    warning: "bg-amber-50 text-amber-700",
    danger: "bg-red-50 text-red-700",
  };

  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-ui-secondary">{label}</p>
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tones[tone]}`}
        >
          {icon}
        </span>
      </div>
      <p className="mt-5 font-title text-2xl font-semibold tracking-tight text-ui-text [font-variant-numeric:tabular-nums] sm:text-[26px]">
        {value}
      </p>
      <p className="mt-1 text-xs leading-5 text-ui-secondary">{hint}</p>
    </Card>
  );
}

function PanelTitle({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <h2 className="font-title text-lg font-semibold tracking-tight text-ui-text">
          {title}
        </h2>
        {description && (
          <p className="mt-1 text-sm leading-6 text-ui-secondary">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}

function NoActiveCompanyNotice() {
  return (
    <div className="mt-6 rounded-2xl border border-primary/20 bg-primary/[0.05] p-5 text-sm text-ui-secondary">
      <p>
        Votre abonnement est actif. Créez une entreprise pour commencer à
        alimenter ce tableau de bord.
      </p>
      <Link
        href="/my-companies"
        className="mt-3 inline-block font-semibold text-primary hover:underline"
      >
        Gérer mes entreprises
      </Link>
    </div>
  );
}

async function Dashboard() {
  const [subscriptionResponse, companiesResponse] = await Promise.all([
    getMySubscriptionServer(),
    getMyCompaniesServer(),
  ]);
  const personalPlan = subscriptionResponse.ok
    ? subscriptionResponse.data?.currentPlan
    : null;
  const companyAccessResponse = personalPlan
    ? null
    : await getActiveCompanyPlanAccessServer();
  const companyPlan = companyAccessResponse?.ok
    ? companyAccessResponse.data.currentPlan
    : null;
  const currentPlan = personalPlan ?? companyPlan;

  if (!companiesResponse.ok || !currentPlan) {
    return (
      <main className={dashboardMainClass}>
        <p
          role="alert"
          className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-800"
        >
          Impossible de charger votre tableau de bord pour le moment.
        </p>
      </main>
    );
  }

  const hasActiveCompany = Boolean(companiesResponse.data.activeCompanyId);
  let summary: DashboardSummary | null = null;
  let proDashboard: ProDashboard | null = null;

  if (hasActiveCompany) {
    const [summaryResponse, proResponse] = await Promise.all([
      getDashboardSummaryServer(),
      currentPlan === "PRO" ? getProDashboardServer() : Promise.resolve(null),
    ]);
    summary = summaryResponse.ok ? summaryResponse.data : null;
    proDashboard = proResponse?.ok ? proResponse.data : null;
  } else {
    summary = emptyDashboardSummary();
    if (currentPlan === "PRO") {
      proDashboard = emptyProDashboard();
    }
  }

  if (!summary || (currentPlan === "PRO" && !proDashboard)) {
    return (
      <main className={dashboardMainClass}>
        <p
          role="alert"
          className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-800"
        >
          Impossible de charger les données du tableau de bord pour le moment.
        </p>
      </main>
    );
  }

  if (currentPlan === "PRO" && proDashboard) {
    const maxForecast = Math.max(
      ...proDashboard.cashflowForecast.map((item) => item.amount),
      1,
    );
    return (
      <main className={dashboardMainClass}>
        <DashboardHeader
          plan="Pro"
          description="Suivez vos encaissements, vos prévisions et la performance de votre activité."
        />
        {!hasActiveCompany && <NoActiveCompanyNotice />}
        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="CA facturé"
            value={formatCurrency(summary.billedAmount)}
            hint="Total hors brouillons"
            icon={<ReceiptText className="h-4 w-4" />}
          />
          <MetricCard
            label="CA encaissé"
            value={formatCurrency(summary.collectedAmount)}
            hint="Paiements confirmés"
            tone="success"
            icon={<ArrowDownLeft className="h-4 w-4" />}
          />
          <MetricCard
            label="À encaisser"
            value={formatCurrency(summary.outstandingAmount)}
            hint={`${summary.pendingInvoicesCount} facture${summary.pendingInvoicesCount === 1 ? "" : "s"} en attente`}
            tone="warning"
            icon={<WalletCards className="h-4 w-4" />}
          />
          <MetricCard
            label="Prévisionnel"
            value={formatCurrency(
              proDashboard.cashflowForecast[0]?.amount ?? 0,
            )}
            hint={
              proDashboard.cashflowForecast[0]?.month ??
              "Aucun encaissement à venir"
            }
            icon={<TrendingUp className="h-4 w-4" />}
          />
        </div>

        <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.65fr)_minmax(340px,1fr)]">
          <Card>
            <PanelTitle
              title="Évolution du chiffre d’affaires"
              description="Facturé et encaissé sur les six derniers mois."
            />
            <div className="mt-6 h-72 sm:h-80">
              <ProRevenueChart points={proDashboard.revenueByMonth} />
            </div>
          </Card>
          <Card>
            <PanelTitle
              title="Modes de paiement"
              description="Répartition des montants facturés."
            />
            <div className="mt-7 space-y-5">
              {[
                [
                  "Pay by Bank",
                  proDashboard.paymentDistribution.payByBankPercent,
                  "bg-primary",
                ],
                [
                  "Paiement en plusieurs fois",
                  proDashboard.paymentDistribution.instalmentsPercent,
                  "bg-emerald-500",
                ],
              ].map(([label, percent, color]) => (
                <div key={String(label)}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-ui-secondary">{label}</span>
                    <strong className="text-ui-text">{percent} %</strong>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-ui-subtle">
                    <div
                      className={`h-full rounded-full ${color}`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <dl className="mt-8 grid grid-cols-2 gap-3 border-t border-ui-border pt-5 text-sm">
              <div className="rounded-xl bg-ui-subtle p-3">
                <dt className="text-ui-secondary">Échéanciers en 2×</dt>
                <dd className="mt-1 font-title text-xl font-semibold text-ui-text">
                  {proDashboard.paymentDistribution.twoInstalments}
                </dd>
              </div>
              <div className="rounded-xl bg-ui-subtle p-3">
                <dt className="text-ui-secondary">En 3× ou plus</dt>
                <dd className="mt-1 font-title text-xl font-semibold text-ui-text">
                  {proDashboard.paymentDistribution.threePlusInstalments}
                </dd>
              </div>
            </dl>
          </Card>
        </div>

        <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(340px,1fr)]">
          <Card>
            <PanelTitle
              title="Encaissements prévus"
              description="Montants attendus sur les prochaines échéances."
            />
            <div className="mt-6 space-y-4">
              {proDashboard.cashflowForecast.map((item) => (
                <div
                  key={item.month}
                  className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 text-sm sm:grid sm:grid-cols-[minmax(5rem,0.7fr)_minmax(5.5rem,0.7fr)_minmax(4rem,1.6fr)]"
                >
                  <span className="capitalize text-ui-secondary">{item.month}</span>
                  <strong className="text-ui-text">
                    {formatCurrency(item.amount)}
                  </strong>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-ui-subtle sm:w-auto">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{
                        width: `${Math.max(6, (item.amount / maxForecast) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
              {!proDashboard.cashflowForecast.length && (
                <p className="rounded-xl bg-ui-subtle p-4 text-sm text-ui-secondary">
                  Aucun encaissement à prévoir.
                </p>
              )}
            </div>
          </Card>
          <Card>
            <PanelTitle title="Alertes à traiter" />
            <ul className="mt-5 space-y-3 text-sm">
              <li className="flex items-center gap-3 rounded-xl bg-red-50 p-3 text-red-800">
                <CircleAlert className="h-4 w-4 shrink-0" />
                <span>
                  <strong>{proDashboard.alerts.overdueInvoices}</strong>{" "}
                  facture(s) en retard
                </span>
              </li>
              <li className="flex items-center gap-3 rounded-xl bg-amber-50 p-3 text-amber-800">
                <Clock3 className="h-4 w-4 shrink-0" />
                <span>
                  <strong>{proDashboard.alerts.overdueInstalments}</strong>{" "}
                  échéance(s) échue(s)
                </span>
              </li>
              <li className="flex items-center gap-3 rounded-xl bg-primary/[0.05] p-3 text-primary">
                <FileText className="h-4 w-4 shrink-0" />
                <span>
                  <strong>{proDashboard.alerts.unansweredEstimates}</strong>{" "}
                  devis sans réponse
                </span>
              </li>
            </ul>
          </Card>
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-3">
          <Card>
            <PanelTitle title="Performance commerciale" />
            <dl className="mt-5 space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-ui-secondary">Acceptation des devis</dt>
                <dd className="font-semibold">
                  {proDashboard.performance.acceptanceRate} %
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ui-secondary">Conversion en facture</dt>
                <dd className="font-semibold">
                  {proDashboard.performance.invoiceConversionRate} %
                </dd>
              </div>
              <div className="flex justify-between border-t border-ui-border pt-3">
                <dt className="text-ui-secondary">Panier moyen</dt>
                <dd className="font-semibold">
                  {formatCurrency(
                    proDashboard.performance.averageInvoiceAmount,
                  )}
                </dd>
              </div>
            </dl>
          </Card>
          <Card>
            <PanelTitle title="Suivi des paiements" />
            <dl className="mt-5 space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-ui-secondary">Délai moyen</dt>
                <dd className="font-semibold">
                  {proDashboard.payments.averageDelayDays === null
                    ? "—"
                    : `${proDashboard.payments.averageDelayDays} j`}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ui-secondary">Échéances à venir</dt>
                <dd className="font-semibold">
                  {proDashboard.payments.upcomingInstalments}
                </dd>
              </div>
              <div className="flex justify-between border-t border-ui-border pt-3">
                <dt className="text-ui-secondary">Échéances en retard</dt>
                <dd className="font-semibold text-red-700">
                  {proDashboard.payments.overdueInstalments}
                </dd>
              </div>
            </dl>
          </Card>
          <Card>
            <PanelTitle title="Top clients" />
            <ul className="mt-5 space-y-3 text-sm">
              {proDashboard.topClients.map((client, index) => (
                <li
                  key={client.name}
                  className="flex items-center justify-between gap-3"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ui-subtle text-xs font-semibold text-ui-secondary">
                      {index + 1}
                    </span>
                    <span className="truncate">{client.name}</span>
                  </span>
                  <strong>{formatCurrency(client.amount)}</strong>
                </li>
              ))}
              {!proDashboard.topClients.length && (
                <li className="rounded-xl bg-ui-subtle p-3 text-ui-secondary">
                  Aucun encaissement client.
                </li>
              )}
            </ul>
          </Card>
        </div>
      </main>
    );
  }

  if (currentPlan === "STARTER") {
    const performance = summary.starter.commercialPerformance;
    return (
      <main className={dashboardMainClass}>
        <DashboardHeader
          plan="Starter"
          description="Gardez le contrôle sur vos factures, devis et relances."
        />
        {!hasActiveCompany && <NoActiveCompanyNotice />}
        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="CA facturé"
            value={formatCurrency(summary.billedAmount)}
            hint="Total hors brouillons"
            icon={<ReceiptText className="h-4 w-4" />}
          />
          <MetricCard
            label="CA encaissé"
            value={formatCurrency(summary.collectedAmount)}
            hint="Paiements confirmés"
            tone="success"
            icon={<ArrowDownLeft className="h-4 w-4" />}
          />
          <MetricCard
            label="À encaisser"
            value={formatCurrency(summary.outstandingAmount)}
            hint={`${summary.pendingInvoicesCount} facture${summary.pendingInvoicesCount === 1 ? "" : "s"} en attente`}
            tone="warning"
            icon={<WalletCards className="h-4 w-4" />}
          />
          <MetricCard
            label="En retard"
            value={`${summary.overdueInvoicesCount}`}
            hint="Facture(s) à relancer"
            tone="danger"
            icon={<BellRing className="h-4 w-4" />}
          />
        </div>
        <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.65fr)_minmax(340px,1fr)]">
          <Card>
            <PanelTitle
              title="Évolution du chiffre d’affaires"
              description="Facturé sur les six derniers mois."
            />
            <div className="mt-6 h-72 sm:h-80">
              <StarterRevenueChart points={summary.starter.revenueByMonth} />
            </div>
          </Card>
          <Card>
            <PanelTitle
              title="Performance commerciale"
              description="Suivi des devis envoyés."
            />
            <dl className="mt-6 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl bg-ui-subtle p-3">
                <dt className="text-ui-secondary">Envoyés</dt>
                <dd className="mt-1 font-title text-xl font-semibold">
                  {performance.sent}
                </dd>
              </div>
              <div className="rounded-xl bg-emerald-50 p-3">
                <dt className="text-emerald-700">Acceptés</dt>
                <dd className="mt-1 font-title text-xl font-semibold text-emerald-800">
                  {performance.accepted}
                </dd>
              </div>
              <div className="rounded-xl bg-primary/[0.05] p-3">
                <dt className="text-primary">En négociation</dt>
                <dd className="mt-1 font-title text-xl font-semibold text-primary">
                  {performance.negotiating}
                </dd>
              </div>
              <div className="rounded-xl bg-red-50 p-3">
                <dt className="text-red-700">Refusés</dt>
                <dd className="mt-1 font-title text-xl font-semibold text-red-800">
                  {performance.rejected}
                </dd>
              </div>
            </dl>
            <div className="mt-5 flex items-center justify-between rounded-xl border border-primary/15 bg-primary/[0.04] p-3 text-sm">
              <span className="text-ui-secondary">Taux d’acceptation</span>
              <strong className="font-title text-xl text-primary">
                {performance.acceptanceRate} %
              </strong>
            </div>
          </Card>
        </div>
        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          <Card>
            <PanelTitle
              title="Relances à effectuer"
              description="Factures à suivre en priorité."
              action={<BellRing className="h-5 w-5 text-primary" />}
            />
            <ul className="mt-5 divide-y divide-zinc-100">
              {summary.starter.reminders.map((invoice) => (
                <li
                  key={invoice.id}
                  className="flex items-center justify-between gap-3 py-3 text-sm"
                >
                  <Link
                    href={`/documents/${invoice.id}`}
                    className="rounded-md font-semibold text-ui-text hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  >
                    {invoice.documentNumber ?? "Facture"}
                  </Link>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-medium ${invoiceTone(invoice.invoiceStatus)}`}
                  >
                    {invoiceLabel(invoice.invoiceStatus)}
                  </span>
                </li>
              ))}
              {!summary.starter.reminders.length && (
                <li className="rounded-xl bg-ui-subtle p-4 text-sm text-ui-secondary">
                  Aucune relance à effectuer.
                </li>
              )}
            </ul>
          </Card>
          <Card>
            <PanelTitle
              title="Devis à suivre"
              description="En attente de la réponse de vos clients."
              action={<CalendarClock className="h-5 w-5 text-primary" />}
            />
            <ul className="mt-5 divide-y divide-zinc-100">
              {summary.pendingEstimates.map((estimate) => (
                <li
                  key={estimate.id}
                  className="flex items-center justify-between gap-3 py-3 text-sm"
                >
                  <Link
                    href={`/documents/${estimate.id}`}
                    className="rounded-md font-semibold text-ui-text hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  >
                    {estimate.documentNumber ?? "Devis"}
                  </Link>
                  <span className="text-ui-secondary">
                    {formatCurrency(estimate.totalPrice)}
                  </span>
                </li>
              ))}
              {!summary.pendingEstimates.length && (
                <li className="rounded-xl bg-ui-subtle p-4 text-sm text-ui-secondary">
                  Aucun devis à suivre.
                </li>
              )}
            </ul>
          </Card>
        </div>
        <Card className="mt-5">
          <PanelTitle title="Activité récente" />
          <ul className="mt-4 grid gap-2 text-sm text-ui-secondary sm:grid-cols-2 lg:grid-cols-3">
            {summary.recentActivity.map((activity) => (
              <li key={activity.id} className="rounded-xl bg-ui-subtle p-3">
                {activityLabel(activity)}
              </li>
            ))}
            {!summary.recentActivity.length && (
              <li className="rounded-xl bg-ui-subtle p-4 text-ui-secondary">
                Aucune activité récente.
              </li>
            )}
          </ul>
        </Card>
      </main>
    );
  }

  return (
    <main className={dashboardMainClass}>
      <DashboardHeader
        plan="Free"
        description="Une vue claire de vos factures et devis récents."
      />
      {!hasActiveCompany && <NoActiveCompanyNotice />}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="CA facturé"
          value={formatCurrency(summary?.billedAmount ?? 0)}
          hint="Total hors brouillons"
          icon={<ReceiptText className="h-4 w-4" />}
        />
        <MetricCard
          label="CA encaissé"
          value={formatCurrency(summary?.collectedAmount ?? 0)}
          hint="Paiements confirmés"
          tone="success"
          icon={<ArrowDownLeft className="h-4 w-4" />}
        />
        <MetricCard
          label="À encaisser"
          value={formatCurrency(summary?.outstandingAmount ?? 0)}
          hint="Factures en attente de règlement"
          tone="warning"
          icon={<WalletCards className="h-4 w-4" />}
        />
        <MetricCard
          label="En retard"
          value={`${summary?.overdueInvoicesCount ?? 0}`}
          hint="Facture(s) à traiter"
          tone="danger"
          icon={<BellRing className="h-4 w-4" />}
        />
      </div>
      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <Card>
          <PanelTitle
            title="Factures récentes"
            description="Vos derniers documents émis."
            action={
              <Link
                href="/documents"
                className="rounded-md text-sm font-semibold text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                Tout voir
              </Link>
            }
          />
          <ul className="mt-5 divide-y divide-zinc-100">
            {summary?.recentInvoices.map((invoice) => (
              <li
                key={invoice.id}
                className="flex items-center justify-between gap-3 py-3 text-sm"
              >
                <div className="min-w-0">
                  <Link
                    href={`/documents/${invoice.id}`}
                    className="rounded-md font-semibold text-ui-text hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  >
                    {invoice.documentNumber ?? "Facture sans numéro"}
                  </Link>
                  <p className="mt-0.5 text-xs text-ui-secondary">
                    {formatCurrency(invoice.totalPrice)}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${invoiceTone(invoice.invoiceStatus)}`}
                >
                  {invoiceLabel(invoice.invoiceStatus)}
                </span>
              </li>
            ))}
            {!summary?.recentInvoices.length && (
              <li className="rounded-xl bg-ui-subtle p-4 text-sm text-ui-secondary">
                Aucune facture récente.
              </li>
            )}
          </ul>
        </Card>
        <Card>
          <PanelTitle
            title="Devis en attente"
            description="À suivre auprès de vos clients."
            action={
              <Link
                href="/documents"
                className="rounded-md text-sm font-semibold text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                Tout voir
              </Link>
            }
          />
          <ul className="mt-5 divide-y divide-zinc-100">
            {summary?.pendingEstimates.map((estimate) => (
              <li
                key={estimate.id}
                className="flex items-center justify-between gap-3 py-3 text-sm"
              >
                <Link
                  href={`/documents/${estimate.id}`}
                  className="rounded-md font-semibold text-ui-text hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  {estimate.documentNumber ?? "Devis sans numéro"}
                </Link>
                <strong className="shrink-0">
                  {formatCurrency(estimate.totalPrice)}
                </strong>
              </li>
            ))}
            {!summary?.pendingEstimates.length && (
              <li className="rounded-xl bg-ui-subtle p-4 text-sm text-ui-secondary">
                Aucun devis en attente.
              </li>
            )}
          </ul>
        </Card>
      </div>
      <Card className="mt-5">
        <PanelTitle title="Activité récente" />
        <ul className="mt-4 grid gap-2 text-sm text-ui-secondary sm:grid-cols-2 lg:grid-cols-3">
          {summary?.recentActivity.map((activity) => (
            <li key={activity.id} className="rounded-xl bg-ui-subtle p-3">
              {activityLabel(activity)}
            </li>
          ))}
          {!summary?.recentActivity.length && (
            <li className="rounded-xl bg-ui-subtle p-4 text-ui-secondary">
              Aucune activité récente.
            </li>
          )}
        </ul>
      </Card>
    </main>
  );
}

export default Dashboard;
