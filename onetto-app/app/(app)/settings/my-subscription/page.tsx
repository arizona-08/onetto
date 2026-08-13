import { getCurrentInvoiceFeeSummaryServer } from '@/lib/companies/companies.server';

const MOCKED_SUBSCRIPTION_LABEL = 'Essentiel';

function formatCurrency(amountInCents: number) {
  return (amountInCents / 100).toLocaleString('fr-FR', {
    style: 'currency',
    currency: 'EUR',
  });
}

function formatPeriodStart(periodStart: string) {
  return new Intl.DateTimeFormat('fr-FR', {
    month: 'long',
    year: 'numeric',
  }).format(new Date(periodStart));
}

async function SubscriptionPage() {
  const summaryResult = await getCurrentInvoiceFeeSummaryServer();
  const summary = summaryResult.ok
    ? summaryResult.data
    : {
        periodStart: new Date().toISOString(),
        totalAmountInCents: 0,
        companies: [],
      };

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-medium text-zinc-500">Mon abonnement</p>
        <h1 className="mt-1 font-title text-2xl font-black text-zinc-900">
          Formule {MOCKED_SUBSCRIPTION_LABEL}
        </h1>
        <p className="mt-2 text-sm text-zinc-600">
          Le libellé de l&apos;abonnement est temporairement simulé.
        </p>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium text-zinc-500">
              Frais accumulés sur la période en cours
            </p>
            <h2 className="mt-1 font-title text-3xl font-black text-zinc-900">
              {formatCurrency(summary.totalAmountInCents)}
            </h2>
          </div>
          <p className="text-sm text-zinc-500">
            Depuis le 1er {formatPeriodStart(summary.periodStart)}
          </p>
        </div>

        <div className="mt-6 overflow-x-auto rounded-xl border border-zinc-100">
          <table className="min-w-150 w-full text-left text-sm">
            <thead className="bg-zinc-50 text-xs font-semibold uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="px-5 py-4">Entreprise</th>
                <th className="px-5 py-4 text-right">Factures encaissées</th>
                <th className="px-5 py-4 text-right">Frais</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 text-zinc-700">
              {summary.companies.map((company) => (
                <tr key={company.companyId}>
                  <td className="px-5 py-4 font-medium text-zinc-900">
                    {company.companyName}
                  </td>
                  <td className="px-5 py-4 text-right">
                    {company.paidInvoicesCount}
                  </td>
                  <td className="px-5 py-4 text-right font-semibold text-zinc-900">
                    {formatCurrency(company.amountInCents)}
                  </td>
                </tr>
              ))}
              {summary.companies.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-5 py-8 text-center text-zinc-500">
                    Aucune entreprise détenue.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

export default SubscriptionPage;
