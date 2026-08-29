import Greetings from '@/app/components/atoms/Greetings';
import ProRevenueChart from '@/app/components/organisms/ProRevenueChart';
import StarterRevenueChart from '@/app/components/organisms/StarterRevenueChart';
import { getActiveCompanyPlanAccessServer } from '@/lib/companies/companies.server';
import { getDashboardSummaryServer, getProDashboardServer } from '@/lib/documents/document.server';
import {
  ArrowDownLeft,
  ArrowUpRight,
  BarChart3,
  BellRing,
  CalendarClock,
  CircleAlert,
  Clock3,
  FileText,
  Landmark,
  ReceiptText,
  TrendingUp,
  WalletCards,
} from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';

function formatCurrency(amount: number) {
  return amount.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });
}

function invoiceLabel(status: string) {
  return {
    PAID: 'Payée',
    PAID_MANUALLY: 'Payée',
    PENDING: 'En attente',
    PAYMENT_IN_PROGRESS: 'En cours',
    OVERDUE: 'En retard',
    PARTIALLY_PAID: 'Partiellement payée',
    REJECTED: 'Refusée',
    DRAFT: 'Brouillon',
  }[status] ?? status;
}

function invoiceTone(status: string) {
  if (status === 'PAID' || status === 'PAID_MANUALLY') return 'bg-emerald-50 text-emerald-700';
  if (status === 'OVERDUE' || status === 'REJECTED') return 'bg-red-50 text-red-700';
  if (status === 'DRAFT') return 'bg-zinc-100 text-zinc-600';
  return 'bg-amber-50 text-amber-700';
}

function activityLabel(activity: {
  type: 'INVOICE' | 'ESTIMATE';
  documentNumber: string | null;
  invoiceStatus: string;
  estimateStatus: string;
}) {
  const number = activity.documentNumber ?? 'sans numéro';
  if (activity.type === 'INVOICE') return `Facture ${number} — ${invoiceLabel(activity.invoiceStatus)}`;
  return `Devis ${number} — ${activity.estimateStatus === 'ACCEPTED' ? 'accepté' : activity.estimateStatus === 'REJECTED' ? 'refusé' : 'en attente'}`;
}

function DashboardHeader({ plan, description }: { plan: 'Free' | 'Starter' | 'Pro'; description: string }) {
  return (
    <header className="flex flex-col gap-4 border-b border-zinc-200 pb-6 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <Greetings />
        <p className="mt-1 text-sm text-zinc-600">{description}</p>
      </div>
      <span className="inline-flex w-fit items-center gap-2 rounded-full border border-primary/15 bg-primary/[0.05] px-3 py-1.5 text-xs font-semibold text-primary">
        <BarChart3 className="h-3.5 w-3.5" aria-hidden="true" />
        Tableau de bord {plan}
      </span>
    </header>
  );
}

function MetricCard({ label, value, hint, icon, tone = 'primary' }: { label: string; value: string; hint: string; icon: ReactNode; tone?: 'primary' | 'success' | 'warning' | 'danger' }) {
  const tones = {
    primary: 'bg-primary/10 text-primary',
    success: 'bg-emerald-50 text-emerald-700',
    warning: 'bg-amber-50 text-amber-700',
    danger: 'bg-red-50 text-red-700',
  };

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-zinc-600">{label}</p>
        <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${tones[tone]}`}>{icon}</span>
      </div>
      <p className="mt-4 font-title text-2xl font-semibold tracking-tight text-zinc-900">{value}</p>
      <p className="mt-1 text-xs text-zinc-500">{hint}</p>
    </section>
  );
}

function PanelTitle({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <h2 className="font-title text-lg font-semibold text-zinc-900">{title}</h2>
        {description && <p className="mt-1 text-sm text-zinc-500">{description}</p>}
      </div>
      {action}
    </div>
  );
}

async function Dashboard() {
  const accessResponse = await getActiveCompanyPlanAccessServer();
  const [response, proResponse] = await Promise.all([
    getDashboardSummaryServer(),
    accessResponse.ok && accessResponse.data.currentPlan === 'PRO'
      ? getProDashboardServer()
      : Promise.resolve(null),
  ]);
  const summary = response.ok ? response.data : null;
  const proDashboard = proResponse?.ok ? proResponse.data : null;
  const isStarterDashboard = accessResponse.ok && accessResponse.data.currentPlan === 'STARTER';

  if (summary && proDashboard && accessResponse.ok && accessResponse.data.currentPlan === 'PRO') {
    const maxForecast = Math.max(...proDashboard.cashflowForecast.map((item) => item.amount), 1);
    return (
      <main className="mx-auto w-full max-w-7xl p-4 sm:p-6 lg:p-8">
        <DashboardHeader plan="Pro" description="Suivez vos encaissements, vos prévisions et la performance de votre activité." />
        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="CA facturé" value={formatCurrency(summary.billedAmount)} hint="Total hors brouillons" icon={<ReceiptText className="h-4 w-4" />} />
          <MetricCard label="CA encaissé" value={formatCurrency(summary.collectedAmount)} hint="Paiements confirmés" tone="success" icon={<ArrowDownLeft className="h-4 w-4" />} />
          <MetricCard label="À encaisser" value={formatCurrency(summary.outstandingAmount)} hint={`${summary.pendingInvoicesCount} facture${summary.pendingInvoicesCount === 1 ? '' : 's'} en attente`} tone="warning" icon={<WalletCards className="h-4 w-4" />} />
          <MetricCard label="Prévisionnel" value={formatCurrency(proDashboard.cashflowForecast[0]?.amount ?? 0)} hint={proDashboard.cashflowForecast[0]?.month ?? 'Aucun encaissement à venir'} icon={<TrendingUp className="h-4 w-4" />} />
        </div>

        <div className="mt-4 grid gap-4 xl:grid-cols-[1.45fr_0.85fr]">
          <section className="rounded-2xl border border-zinc-200 bg-white p-5">
            <PanelTitle title="Évolution du chiffre d’affaires" description="Facturé et encaissé sur les six derniers mois." />
            <div className="mt-6 h-72"><ProRevenueChart points={proDashboard.revenueByMonth} /></div>
          </section>
          <section className="rounded-2xl border border-zinc-200 bg-white p-5">
            <PanelTitle title="Modes de paiement" description="Répartition des montants facturés." />
            <div className="mt-7 space-y-5">
              {[['Pay by Bank', proDashboard.paymentDistribution.payByBankPercent, 'bg-primary'], ['Paiement en plusieurs fois', proDashboard.paymentDistribution.instalmentsPercent, 'bg-emerald-500']].map(([label, percent, color]) => (
                <div key={String(label)}>
                  <div className="flex items-center justify-between text-sm"><span className="font-medium text-zinc-700">{label}</span><strong className="text-zinc-900">{percent} %</strong></div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-zinc-100"><div className={`h-full rounded-full ${color}`} style={{ width: `${percent}%` }} /></div>
                </div>
              ))}
            </div>
            <dl className="mt-8 grid grid-cols-2 gap-3 border-t border-zinc-100 pt-5 text-sm">
              <div className="rounded-xl bg-zinc-50 p-3"><dt className="text-zinc-500">Échéanciers en 2×</dt><dd className="mt-1 font-title text-xl font-semibold text-zinc-900">{proDashboard.paymentDistribution.twoInstalments}</dd></div>
              <div className="rounded-xl bg-zinc-50 p-3"><dt className="text-zinc-500">En 3× ou plus</dt><dd className="mt-1 font-title text-xl font-semibold text-zinc-900">{proDashboard.paymentDistribution.threePlusInstalments}</dd></div>
            </dl>
          </section>
        </div>

        <div className="mt-4 grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
          <section className="rounded-2xl border border-zinc-200 bg-white p-5">
            <PanelTitle title="Encaissements prévus" description="Montants attendus sur les prochaines échéances." />
            <div className="mt-6 space-y-4">
              {proDashboard.cashflowForecast.map((item) => <div key={item.month} className="grid grid-cols-[minmax(5rem,0.7fr)_minmax(5.5rem,0.7fr)_minmax(4rem,1.6fr)] items-center gap-3 text-sm"><span className="capitalize text-zinc-600">{item.month}</span><strong className="text-zinc-900">{formatCurrency(item.amount)}</strong><div className="h-2 overflow-hidden rounded-full bg-zinc-100"><div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(6, (item.amount / maxForecast) * 100)}%` }} /></div></div>)}
              {!proDashboard.cashflowForecast.length && <p className="rounded-xl bg-zinc-50 p-4 text-sm text-zinc-500">Aucun encaissement à prévoir.</p>}
            </div>
          </section>
          <section className="rounded-2xl border border-zinc-200 bg-white p-5">
            <PanelTitle title="Alertes à traiter" />
            <ul className="mt-5 space-y-3 text-sm">
              <li className="flex items-center gap-3 rounded-xl bg-red-50 p-3 text-red-800"><CircleAlert className="h-4 w-4 shrink-0" /><span><strong>{proDashboard.alerts.overdueInvoices}</strong> facture(s) en retard</span></li>
              <li className="flex items-center gap-3 rounded-xl bg-amber-50 p-3 text-amber-800"><Clock3 className="h-4 w-4 shrink-0" /><span><strong>{proDashboard.alerts.overdueInstalments}</strong> échéance(s) échue(s)</span></li>
              <li className="flex items-center gap-3 rounded-xl bg-primary/[0.05] p-3 text-primary"><FileText className="h-4 w-4 shrink-0" /><span><strong>{proDashboard.alerts.unansweredEstimates}</strong> devis sans réponse</span></li>
            </ul>
          </section>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          <section className="rounded-2xl border border-zinc-200 bg-white p-5"><PanelTitle title="Performance commerciale" /><dl className="mt-5 space-y-3 text-sm"><div className="flex justify-between"><dt className="text-zinc-500">Acceptation des devis</dt><dd className="font-semibold">{proDashboard.performance.acceptanceRate} %</dd></div><div className="flex justify-between"><dt className="text-zinc-500">Conversion en facture</dt><dd className="font-semibold">{proDashboard.performance.invoiceConversionRate} %</dd></div><div className="flex justify-between border-t border-zinc-100 pt-3"><dt className="text-zinc-500">Panier moyen</dt><dd className="font-semibold">{formatCurrency(proDashboard.performance.averageInvoiceAmount)}</dd></div></dl></section>
          <section className="rounded-2xl border border-zinc-200 bg-white p-5"><PanelTitle title="Suivi des paiements" /><dl className="mt-5 space-y-3 text-sm"><div className="flex justify-between"><dt className="text-zinc-500">Délai moyen</dt><dd className="font-semibold">{proDashboard.payments.averageDelayDays === null ? '—' : `${proDashboard.payments.averageDelayDays} j`}</dd></div><div className="flex justify-between"><dt className="text-zinc-500">Échéances à venir</dt><dd className="font-semibold">{proDashboard.payments.upcomingInstalments}</dd></div><div className="flex justify-between border-t border-zinc-100 pt-3"><dt className="text-zinc-500">Échéances en retard</dt><dd className="font-semibold text-red-700">{proDashboard.payments.overdueInstalments}</dd></div></dl></section>
          <section className="rounded-2xl border border-zinc-200 bg-white p-5"><PanelTitle title="Top clients" /><ul className="mt-5 space-y-3 text-sm">{proDashboard.topClients.map((client, index) => <li key={client.name} className="flex items-center justify-between gap-3"><span className="flex min-w-0 items-center gap-2"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-xs font-semibold text-zinc-600">{index + 1}</span><span className="truncate">{client.name}</span></span><strong>{formatCurrency(client.amount)}</strong></li>)}{!proDashboard.topClients.length && <li className="rounded-xl bg-zinc-50 p-3 text-zinc-500">Aucun encaissement client.</li>}</ul></section>
        </div>
      </main>
    );
  }

  if (summary && isStarterDashboard) {
    const performance = summary.starter.commercialPerformance;
    return (
      <main className="mx-auto w-full max-w-7xl p-4 sm:p-6 lg:p-8">
        <DashboardHeader plan="Starter" description="Gardez le contrôle sur vos factures, devis et relances." />
        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="CA facturé" value={formatCurrency(summary.billedAmount)} hint="Total hors brouillons" icon={<ReceiptText className="h-4 w-4" />} />
          <MetricCard label="CA encaissé" value={formatCurrency(summary.collectedAmount)} hint="Paiements confirmés" tone="success" icon={<ArrowDownLeft className="h-4 w-4" />} />
          <MetricCard label="À encaisser" value={formatCurrency(summary.outstandingAmount)} hint={`${summary.pendingInvoicesCount} facture${summary.pendingInvoicesCount === 1 ? '' : 's'} en attente`} tone="warning" icon={<WalletCards className="h-4 w-4" />} />
          <MetricCard label="En retard" value={`${summary.overdueInvoicesCount}`} hint="Facture(s) à relancer" tone="danger" icon={<BellRing className="h-4 w-4" />} />
        </div>
        <div className="mt-4 grid gap-4 xl:grid-cols-[1.45fr_0.85fr]">
          <section className="rounded-2xl border border-zinc-200 bg-white p-5"><PanelTitle title="Évolution du chiffre d’affaires" description="Facturé sur les six derniers mois." /><div className="mt-6 h-72"><StarterRevenueChart points={summary.starter.revenueByMonth} /></div></section>
          <section className="rounded-2xl border border-zinc-200 bg-white p-5"><PanelTitle title="Performance commerciale" description="Suivi des devis envoyés." /><dl className="mt-6 grid grid-cols-2 gap-3 text-sm"><div className="rounded-xl bg-zinc-50 p-3"><dt className="text-zinc-500">Envoyés</dt><dd className="mt-1 font-title text-xl font-semibold">{performance.sent}</dd></div><div className="rounded-xl bg-emerald-50 p-3"><dt className="text-emerald-700">Acceptés</dt><dd className="mt-1 font-title text-xl font-semibold text-emerald-800">{performance.accepted}</dd></div><div className="rounded-xl bg-primary/[0.05] p-3"><dt className="text-primary">En négociation</dt><dd className="mt-1 font-title text-xl font-semibold text-primary">{performance.negotiating}</dd></div><div className="rounded-xl bg-red-50 p-3"><dt className="text-red-700">Refusés</dt><dd className="mt-1 font-title text-xl font-semibold text-red-800">{performance.rejected}</dd></div></dl><div className="mt-5 flex items-center justify-between rounded-xl border border-primary/15 bg-primary/[0.04] p-3 text-sm"><span className="text-zinc-700">Taux d’acceptation</span><strong className="font-title text-xl text-primary">{performance.acceptanceRate} %</strong></div></section>
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <section className="rounded-2xl border border-zinc-200 bg-white p-5"><PanelTitle title="Relances à effectuer" description="Factures à suivre en priorité." action={<BellRing className="h-5 w-5 text-primary" />} /><ul className="mt-5 divide-y divide-zinc-100">{summary.starter.reminders.map((invoice) => <li key={invoice.id} className="flex items-center justify-between gap-3 py-3 text-sm"><Link href={`/documents/${invoice.id}`} className="font-semibold text-zinc-800 hover:text-primary">{invoice.documentNumber ?? 'Facture'}</Link><span className={`rounded-full px-2.5 py-1 text-xs font-medium ${invoiceTone(invoice.invoiceStatus)}`}>{invoiceLabel(invoice.invoiceStatus)}</span></li>)}{!summary.starter.reminders.length && <li className="rounded-xl bg-zinc-50 p-4 text-sm text-zinc-500">Aucune relance à effectuer.</li>}</ul></section>
          <section className="rounded-2xl border border-zinc-200 bg-white p-5"><PanelTitle title="Devis à suivre" description="En attente de la réponse de vos clients." action={<CalendarClock className="h-5 w-5 text-primary" />} /><ul className="mt-5 divide-y divide-zinc-100">{summary.pendingEstimates.map((estimate) => <li key={estimate.id} className="flex items-center justify-between gap-3 py-3 text-sm"><Link href={`/documents/${estimate.id}`} className="font-semibold text-zinc-800 hover:text-primary">{estimate.documentNumber ?? 'Devis'}</Link><span className="text-zinc-500">{formatCurrency(estimate.totalPrice)}</span></li>)}{!summary.pendingEstimates.length && <li className="rounded-xl bg-zinc-50 p-4 text-sm text-zinc-500">Aucun devis à suivre.</li>}</ul></section>
        </div>
        <section className="mt-4 rounded-2xl border border-zinc-200 bg-white p-5"><PanelTitle title="Activité récente" /><ul className="mt-4 grid gap-2 text-sm text-zinc-700 sm:grid-cols-2 lg:grid-cols-3">{summary.recentActivity.map((activity) => <li key={activity.id} className="rounded-xl bg-zinc-50 p-3">{activityLabel(activity)}</li>)}{!summary.recentActivity.length && <li className="rounded-xl bg-zinc-50 p-4 text-zinc-500">Aucune activité récente.</li>}</ul></section>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-7xl p-4 sm:p-6 lg:p-8">
      <DashboardHeader plan="Free" description="Une vue claire de vos factures et devis récents." />
      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="CA facturé" value={formatCurrency(summary?.billedAmount ?? 0)} hint="Total hors brouillons" icon={<ReceiptText className="h-4 w-4" />} />
        <MetricCard label="CA encaissé" value={formatCurrency(summary?.collectedAmount ?? 0)} hint="Paiements confirmés" tone="success" icon={<ArrowDownLeft className="h-4 w-4" />} />
        <MetricCard label="À encaisser" value={formatCurrency(summary?.outstandingAmount ?? 0)} hint="Factures en attente de règlement" tone="warning" icon={<WalletCards className="h-4 w-4" />} />
        <MetricCard label="En retard" value={`${summary?.overdueInvoicesCount ?? 0}`} hint="Facture(s) à traiter" tone="danger" icon={<BellRing className="h-4 w-4" />} />
      </div>
      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <section className="rounded-2xl border border-zinc-200 bg-white p-5"><PanelTitle title="Factures récentes" description="Vos derniers documents émis." action={<Link href="/documents" className="text-sm font-semibold text-primary hover:underline">Tout voir</Link>} /><ul className="mt-5 divide-y divide-zinc-100">{summary?.recentInvoices.map((invoice) => <li key={invoice.id} className="flex items-center justify-between gap-3 py-3 text-sm"><div className="min-w-0"><Link href={`/documents/${invoice.id}`} className="font-semibold text-zinc-800 hover:text-primary">{invoice.documentNumber ?? 'Facture sans numéro'}</Link><p className="mt-0.5 text-xs text-zinc-500">{formatCurrency(invoice.totalPrice)}</p></div><span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${invoiceTone(invoice.invoiceStatus)}`}>{invoiceLabel(invoice.invoiceStatus)}</span></li>)}{!summary?.recentInvoices.length && <li className="rounded-xl bg-zinc-50 p-4 text-sm text-zinc-500">Aucune facture récente.</li>}</ul></section>
        <section className="rounded-2xl border border-zinc-200 bg-white p-5"><PanelTitle title="Devis en attente" description="À suivre auprès de vos clients." action={<Link href="/documents" className="text-sm font-semibold text-primary hover:underline">Tout voir</Link>} /><ul className="mt-5 divide-y divide-zinc-100">{summary?.pendingEstimates.map((estimate) => <li key={estimate.id} className="flex items-center justify-between gap-3 py-3 text-sm"><Link href={`/documents/${estimate.id}`} className="font-semibold text-zinc-800 hover:text-primary">{estimate.documentNumber ?? 'Devis sans numéro'}</Link><strong className="shrink-0">{formatCurrency(estimate.totalPrice)}</strong></li>)}{!summary?.pendingEstimates.length && <li className="rounded-xl bg-zinc-50 p-4 text-sm text-zinc-500">Aucun devis en attente.</li>}</ul></section>
      </div>
      <section className="mt-4 rounded-2xl border border-zinc-200 bg-white p-5"><PanelTitle title="Activité récente" /><ul className="mt-4 grid gap-2 text-sm text-zinc-700 sm:grid-cols-2 lg:grid-cols-3">{summary?.recentActivity.map((activity) => <li key={activity.id} className="rounded-xl bg-zinc-50 p-3">{activityLabel(activity)}</li>)}{!summary?.recentActivity.length && <li className="rounded-xl bg-zinc-50 p-4 text-zinc-500">Aucune activité récente.</li>}</ul></section>
    </main>
  );
}

export default Dashboard;
