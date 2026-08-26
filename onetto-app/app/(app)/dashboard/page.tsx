
import Greetings from '@/app/components/atoms/Greetings';
import { getDashboardSummaryServer } from '@/lib/documents/document.server';

function formatCurrency(amount: number) {
  return amount.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });
}

async function Dashboard() {
  const response = await getDashboardSummaryServer();
  const summary = response.ok ? response.data : null;

  return (
    <div className="mx-auto w-full max-w-6xl p-4">
      <div className="mb-8"><Greetings /></div>
      <h1 className="font-title text-3xl font-black text-zinc-900">Dashboard</h1>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[
          ['Chiffre d’affaires facturé', summary?.billedAmount],
          ['Chiffre d’affaires encaissé', summary?.collectedAmount],
          ['Restant à encaisser', summary?.outstandingAmount],
        ].map(([label, value]) => (
          <section key={String(label)} className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-zinc-500">{label}</p>
            <p className="mt-2 font-title text-2xl font-black text-zinc-900">{typeof value === 'number' ? formatCurrency(value) : '—'}</p>
          </section>
        ))}
        {[
          ['Factures en attente', summary?.pendingInvoicesCount],
          ['Factures en retard', summary?.overdueInvoicesCount],
          ['Devis en attente', summary?.pendingEstimatesCount],
        ].map(([label, value]) => (
          <section key={String(label)} className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-zinc-500">{label}</p>
            <p className="mt-2 font-title text-2xl font-black text-zinc-900">{typeof value === 'number' ? value : '—'}</p>
          </section>
        ))}
      </div>
    </div>
  );
}

export default Dashboard
