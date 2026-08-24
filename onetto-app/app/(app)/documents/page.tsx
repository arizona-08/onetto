import {
  getDocumentsPageServer,
  getInvoiceStatsServer,
  InvoiceStats,
} from '@/lib/documents/document.server';
import { getMyCompaniesServer } from '@/lib/companies/companies.server';
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  FileText,
} from 'lucide-react';
import type { ReactNode } from 'react';
import DocumentsTable from '@/app/components/organisms/DocumentsTable';
import DocumentsTypeSwitch from '@/app/components/organisms/DocumentsTypeSwitch';

export const dynamic = 'force-dynamic'

const emptyStats: InvoiceStats = {
  paid: { count: 0, totalAmount: 0 },
  pending: { count: 0, totalAmount: 0 },
  overdue: { count: 0, totalAmount: 0 },
  draft: { count: 0, totalAmount: 0 },
};

function formatCurrency(amount: number) {
  return amount.toLocaleString('fr-FR', {
    style: 'currency',
    currency: 'EUR',
  });
}

async function DocumentsPage() {
  const [estimatesResponse, invoicesResponse, invoiceStatsResponse] = await Promise.all([
    getDocumentsPageServer('ESTIMATE'),
    getDocumentsPageServer('INVOICE'),
    getInvoiceStatsServer(),
  ]);

  if (!estimatesResponse.ok || !invoicesResponse.ok) {
    console.error('Failed to fetch documents:', estimatesResponse.ok ? invoicesResponse.error : estimatesResponse.error);
  }
  // console.log('Documents response:', documentsResponse);

  const estimates = estimatesResponse.ok ? estimatesResponse.data.documents : [];
  const invoices = invoicesResponse.ok ? invoicesResponse.data.documents : [];
  const invoiceStats = invoiceStatsResponse.ok
    ? invoiceStatsResponse.data
    : emptyStats;

  const companiesResponse = await getMyCompaniesServer();
  const activeCompany = companiesResponse.ok
    ? companiesResponse.data.companies.find((company) => company.id === companiesResponse.data.activeCompanyId)
    : undefined;
  const currentDate = new Date().toISOString();
  
  return (
    <div className="mx-auto w-full max-w-6xl p-4">
      <h1 className="text-2xl font-black font-title">Gérer mes factures et devis</h1>

      {(!estimatesResponse.ok || !invoicesResponse.ok) && (
        // À modifier en production pour afficher un message d'erreur plus convivial
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900" role="alert">
          Les factures et devis ne peuvent pas être chargés pour le moment. Vérifiez que l&apos;API est démarrée, puis réessayez.
        </div>
      )}

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <InvoiceStatCard
          label="Payées"
          stat={invoiceStats.paid}
          icon={<CheckCircle2 className="h-5 w-5" aria-hidden="true" />}
          iconClassName="bg-emerald-50 text-emerald-600"
        />
        <InvoiceStatCard
          label="En attente"
          stat={invoiceStats.pending}
          icon={<Clock3 className="h-5 w-5" aria-hidden="true" />}
          iconClassName="bg-amber-50 text-amber-600"
        />
        <InvoiceStatCard
          label="En retard"
          stat={invoiceStats.overdue}
          icon={<AlertTriangle className="h-5 w-5" aria-hidden="true" />}
          iconClassName="bg-red-50 text-red-600"
        />
        <InvoiceStatCard
          label="Brouillons"
          stat={invoiceStats.draft}
          icon={<FileText className="h-5 w-5" aria-hidden="true" />}
          iconClassName="bg-zinc-100 text-zinc-600"
        />
      </div>

      <DocumentsTypeSwitch
        notice={activeCompany?.status === 'CLOSED' && (
          <div className="mt-4 rounded-lg border border-red-100 bg-red-50/70 p-4 text-sm text-zinc-700">
            Cette entreprise est fermée : les factures existantes restent consultables, mais aucune nouvelle facture ne peut être créée.
          </div>
        )}
        estimates={(
          <section aria-labelledby="estimates-heading">
            <h2 id="estimates-heading" className="text-xl font-semibold">Devis</h2>
            <DocumentsTable
              type="estimates"
              documents={estimates}
              currentDate={currentDate}
              canCreate={activeCompany?.status !== 'CLOSED'}
              initialPagination={estimatesResponse.ok ? estimatesResponse.data.pagination : undefined}
            />
          </section>
        )}
        invoices={(
          <section aria-labelledby="invoices-heading">
            <h2 id="invoices-heading" className="text-xl font-semibold">Factures</h2>
            <DocumentsTable
              type="invoices"
              documents={invoices}
              currentDate={currentDate}
              canCreate={activeCompany?.status !== 'CLOSED'}
              initialPagination={invoicesResponse.ok ? invoicesResponse.data.pagination : undefined}
            />
          </section>
        )}
      />
    </div>
  )
}

interface InvoiceStatCardProps {
  label: string;
  stat: { count: number; totalAmount: number };
  icon: ReactNode;
  iconClassName: string;
}

function InvoiceStatCard({
  label,
  stat,
  icon,
  iconClassName,
}: InvoiceStatCardProps) {
  const invoiceLabel = stat.count > 1 ? 'factures' : 'facture';

  return (
    <article className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-zinc-500">{label}</p>
          <p className="mt-2 font-title text-3xl font-black text-zinc-900">
            {formatCurrency(stat.totalAmount)}
          </p>
        </div>
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${iconClassName}`}>
          {icon}
        </div>
      </div>
      <p className="mt-5 text-sm text-zinc-500">
        {stat.count} {invoiceLabel}
      </p>
    </article>
  );
}

export default DocumentsPage
