import Greetings from '@/app/components/atoms/Greetings';
import ProRevenueChart from '@/app/components/organisms/ProRevenueChart';
import StarterRevenueChart from '@/app/components/organisms/StarterRevenueChart';
import { getActiveCompanyPlanAccessServer } from '@/lib/companies/companies.server';
import { getDashboardSummaryServer, getProDashboardServer } from '@/lib/documents/document.server';
import Link from 'next/link';

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
  const metrics = [
    ['CA facturé', summary?.billedAmount, 'currency'],
    ['CA encaissé', summary?.collectedAmount, 'currency'],
    ['À encaisser', summary?.outstandingAmount, 'currency'],
    ['En retard', summary?.overdueInvoicesCount, 'count'],
  ] as const;

  if (summary && proDashboard && accessResponse.ok && accessResponse.data.currentPlan === 'PRO') {
    const maxForecast = Math.max(...proDashboard.cashflowForecast.map((item) => item.amount), 1);
    return (
      <main className="mx-auto w-full max-w-6xl p-4 sm:p-6">
        <section className="rounded-3xl bg-zinc-50 p-6 sm:p-8">
          <header className="border-b border-zinc-200 pb-6">
            <Greetings />
            <p className="mt-2 text-sm text-zinc-600">Vue d’ensemble de votre activité — plan Pro</p>
          </header>
          <div className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              ['CA facturé', summary.billedAmount, 'Total hors brouillons'],
              ['CA encaissé', summary.collectedAmount, 'Paiements confirmés'],
              ['À encaisser', summary.outstandingAmount, `${summary.pendingInvoicesCount} facture${summary.pendingInvoicesCount === 1 ? '' : 's'}`],
              ['Prévisionnel', proDashboard.cashflowForecast[0]?.amount ?? 0, proDashboard.cashflowForecast[0] ? proDashboard.cashflowForecast[0].month : 'À venir'],
            ].map(([label, amount, note]) => <section key={label} className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm"><p className="text-sm font-medium text-zinc-600">{label}</p><p className="mt-2 font-title text-xl font-black text-zinc-900">{formatCurrency(Number(amount))}</p><p className="mt-1 text-xs text-zinc-500">{note}</p></section>)}
          </div>
          <div className="mt-8 grid gap-4 lg:grid-cols-[1.35fr_0.9fr]">
            <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm"><h2 className="font-title text-lg font-bold text-zinc-900">CA facturé vs encaissé</h2><div className="mt-5 h-64"><ProRevenueChart points={proDashboard.revenueByMonth} /></div></section>
            <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm"><h2 className="font-title text-lg font-bold text-zinc-900">Répartition des paiements</h2><dl className="mt-5 space-y-3 text-sm"><div className="flex justify-between"><dt>Pay by Bank</dt><dd className="font-semibold">{proDashboard.paymentDistribution.payByBankPercent} %</dd></div><div className="flex justify-between"><dt>Échéanciers</dt><dd className="font-semibold">{proDashboard.paymentDistribution.instalmentsPercent} %</dd></div><div className="border-t border-zinc-200 pt-3"><div className="flex justify-between"><dt>En 2×</dt><dd>{proDashboard.paymentDistribution.twoInstalments}</dd></div><div className="mt-2 flex justify-between"><dt>En 3× ou plus</dt><dd>{proDashboard.paymentDistribution.threePlusInstalments}</dd></div></div></dl></section>
          </div>
          <section className="mt-8 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm"><h2 className="font-title text-lg font-bold text-zinc-900">Encaissements prévus</h2><div className="mt-5 space-y-3">{proDashboard.cashflowForecast.map((item) => <div key={item.month} className="grid grid-cols-[7rem_5rem_1fr] items-center gap-3 text-sm"><span className="capitalize">{item.month}</span><span>{formatCurrency(item.amount)}</span><div className="h-2 rounded-full bg-zinc-100"><div className="h-2 rounded-full bg-primary" style={{ width: `${Math.max(6, (item.amount / maxForecast) * 100)}%` }} /></div></div>)}{!proDashboard.cashflowForecast.length && <p className="text-sm text-zinc-500">Aucun encaissement à prévoir.</p>}</div></section>
          <div className="mt-8 grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
            <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm"><h2 className="font-title text-lg font-bold">Performance devis</h2><dl className="mt-4 space-y-2 text-sm"><div className="flex justify-between"><dt>Acceptation</dt><dd>{proDashboard.performance.acceptanceRate} %</dd></div><div className="flex justify-between"><dt>Conversion facture</dt><dd>{proDashboard.performance.invoiceConversionRate} %</dd></div><div className="flex justify-between"><dt>Panier moyen</dt><dd>{formatCurrency(proDashboard.performance.averageInvoiceAmount)}</dd></div></dl></section>
            <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm"><h2 className="font-title text-lg font-bold">Paiements</h2><dl className="mt-4 space-y-2 text-sm"><div className="flex justify-between"><dt>Délai moyen</dt><dd>{proDashboard.payments.averageDelayDays === null ? '—' : `${proDashboard.payments.averageDelayDays} j`}</dd></div><div className="flex justify-between"><dt>Échéances à venir</dt><dd>{proDashboard.payments.upcomingInstalments}</dd></div><div className="flex justify-between"><dt>Échéances en retard</dt><dd>{proDashboard.payments.overdueInstalments}</dd></div></dl></section>
            <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm"><h2 className="font-title text-lg font-bold">Top clients</h2><ul className="mt-4 space-y-2 text-sm">{proDashboard.topClients.map((client) => <li key={client.name} className="flex justify-between"><span>{client.name}</span><strong>{formatCurrency(client.amount)}</strong></li>)}{!proDashboard.topClients.length && <li className="text-zinc-500">Aucun encaissement client.</li>}</ul></section>
          </div>
          <section className="mt-8 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm"><h2 className="font-title text-lg font-bold">Alertes</h2><ul className="mt-4 grid gap-2 text-sm sm:grid-cols-3"><li>{proDashboard.alerts.overdueInvoices} facture(s) en retard</li><li>{proDashboard.alerts.overdueInstalments} échéance(s) échue(s)</li><li>{proDashboard.alerts.unansweredEstimates} devis sans réponse</li></ul></section>
        </section>
      </main>
    );
  }

  if (summary && isStarterDashboard) {
    const performance = summary.starter.commercialPerformance;
    return (
      <main className="mx-auto w-full max-w-5xl p-4 sm:p-6">
        <section className="rounded-3xl bg-zinc-50 p-6 sm:p-8">
          <header className="border-b border-zinc-200 pb-6">
            <Greetings />
            <p className="mt-2 text-sm text-zinc-600">Vue d’ensemble de votre activité</p>
          </header>
          <div className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {metrics.map(([label, value, type]) => <section key={label} className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm"><p className="text-sm font-medium text-zinc-600">{label}</p><p className="mt-2 font-title text-xl font-black text-zinc-900">{type === 'currency' ? formatCurrency(value ?? 0) : `${value ?? 0} facture${value === 1 ? '' : 's'}`}</p></section>)}
          </div>
          <div className="mt-8 grid gap-4 lg:grid-cols-[1.35fr_0.9fr]">
            <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm"><h2 className="font-title text-lg font-bold text-zinc-900">Évolution du CA</h2><div className="mt-5 h-55"><StarterRevenueChart points={summary.starter.revenueByMonth} /></div></section>
            <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm"><h2 className="font-title text-lg font-bold text-zinc-900">Performance commerciale</h2><dl className="mt-5 space-y-2 text-sm"><div className="flex justify-between"><dt>Devis envoyés</dt><dd>{performance.sent}</dd></div><div className="flex justify-between"><dt>Acceptés</dt><dd>{performance.accepted}</dd></div><div className="flex justify-between"><dt>En négociation</dt><dd>{performance.negotiating}</dd></div><div className="flex justify-between"><dt>Refusés</dt><dd>{performance.rejected}</dd></div><div className="mt-4 flex justify-between border-t border-zinc-200 pt-3 font-semibold"><dt>Taux d’acceptation</dt><dd>{performance.acceptanceRate} %</dd></div></dl></section>
          </div>
          <div className="mt-8 grid gap-4 lg:grid-cols-2">
            <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm"><h2 className="font-title text-lg font-bold text-zinc-900">Relances à effectuer</h2><ul className="mt-4 space-y-2 text-sm">{summary.starter.reminders.map((invoice) => <li key={invoice.id}><Link href={`/documents/${invoice.id}`} className="font-semibold hover:text-primary">{invoice.documentNumber ?? 'Facture'}</Link> — {invoiceLabel(invoice.invoiceStatus)}</li>)}{!summary.starter.reminders.length && <li className="text-zinc-500">Aucune relance à effectuer.</li>}</ul></section>
            <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm"><h2 className="font-title text-lg font-bold text-zinc-900">Devis à suivre</h2><ul className="mt-4 space-y-2 text-sm">{summary.pendingEstimates.map((estimate) => <li key={estimate.id}><Link href={`/documents/${estimate.id}`} className="font-semibold hover:text-primary">{estimate.documentNumber ?? 'Devis'}</Link> — en attente de réponse</li>)}{!summary.pendingEstimates.length && <li className="text-zinc-500">Aucun devis à suivre.</li>}</ul></section>
          </div>
          <section className="mt-8 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm"><h2 className="font-title text-lg font-bold text-zinc-900">Activité récente</h2><ul className="mt-4 space-y-2 text-sm text-zinc-700">{summary.recentActivity.map((activity) => <li key={activity.id}>• {activityLabel(activity)}</li>)}{!summary.recentActivity.length && <li className="text-zinc-500">Aucune activité récente.</li>}</ul></section>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-5xl p-4 sm:p-6">
      <section className="rounded-3xl bg-zinc-50 p-6 sm:p-8">
        <header className="border-b border-zinc-200 pb-6">
          <Greetings />
          <p className="mt-2 text-sm text-zinc-600">Vue d’ensemble de votre activité</p>
        </header>

        <div className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {metrics.map(([label, value, type]) => (
            <section key={label} className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
              <p className="text-sm font-medium text-zinc-600">{label}</p>
              <p className="mt-2 font-title text-xl font-black text-zinc-900">
                {typeof value !== 'number' ? '—' : type === 'currency' ? formatCurrency(value) : `${value} facture${value > 1 ? 's' : ''}`}
              </p>
            </section>
          ))}
        </div>

        <div className="mt-8 grid gap-4 lg:grid-cols-2">
          <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
            <h2 className="font-title text-lg font-bold text-zinc-900">Factures récentes</h2>
            <ul className="mt-4 space-y-3">
              {summary?.recentInvoices.map((invoice) => (
                <li key={invoice.id} className="flex items-center justify-between gap-3 text-sm">
                  <Link href={`/documents/${invoice.id}`} className="font-semibold text-zinc-800 hover:text-primary">{invoice.documentNumber ?? 'Facture sans numéro'}</Link>
                  <span>{formatCurrency(invoice.totalPrice)}</span>
                  <span className="text-zinc-500">{invoiceLabel(invoice.invoiceStatus)}</span>
                </li>
              ))}
              {!summary?.recentInvoices.length && <li className="text-sm text-zinc-500">Aucune facture récente.</li>}
            </ul>
            <Link href="/documents" className="mt-6 inline-block text-sm font-semibold text-primary hover:underline">Voir toutes les factures →</Link>
          </section>

          <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
            <h2 className="font-title text-lg font-bold text-zinc-900">Devis en attente</h2>
            <ul className="mt-4 space-y-3">
              {summary?.pendingEstimates.map((estimate) => (
                <li key={estimate.id} className="flex items-center justify-between gap-3 text-sm">
                  <Link href={`/documents/${estimate.id}`} className="font-semibold text-zinc-800 hover:text-primary">{estimate.documentNumber ?? 'Devis sans numéro'}</Link>
                  <span>{formatCurrency(estimate.totalPrice)}</span>
                </li>
              ))}
              {!summary?.pendingEstimates.length && <li className="text-sm text-zinc-500">Aucun devis en attente.</li>}
            </ul>
            <Link href="/documents" className="mt-6 inline-block text-sm font-semibold text-primary hover:underline">Voir tous les devis →</Link>
          </section>
        </div>

        <section className="mt-8 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
          <h2 className="font-title text-lg font-bold text-zinc-900">Activité récente</h2>
          <ul className="mt-4 space-y-2 text-sm text-zinc-700">
            {summary?.recentActivity.map((activity) => <li key={activity.id}>• {activityLabel(activity)}</li>)}
            {!summary?.recentActivity.length && <li className="text-zinc-500">Aucune activité récente.</li>}
          </ul>
        </section>
      </section>
    </main>
  );
}

export default Dashboard;
