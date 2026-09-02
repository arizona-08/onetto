import {
  getDocumentsPageServer,
  getInvoiceStatsServer,
  InvoiceStats,
} from '@/lib/documents/document.server';
import { getMyCompaniesServer } from '@/lib/companies/companies.server';
import DocumentsTable from '@/app/components/organisms/DocumentsTable';
import DocumentsTypeSwitch from '@/app/components/organisms/DocumentsTypeSwitch';
import InvoiceStatsOverview from '@/app/components/organisms/InvoiceStatsOverview';

export const dynamic = 'force-dynamic'

const emptyStats: InvoiceStats = {
  paid: { count: 0, totalAmount: 0 },
  pending: { count: 0, totalAmount: 0 },
  overdue: { count: 0, totalAmount: 0 },
  draft: { count: 0, totalAmount: 0 },
};

async function DocumentsPage() {
  const [estimatesResponse, invoicesResponse, invoiceStatsResponse] = await Promise.all([
    getDocumentsPageServer('ESTIMATE'),
    getDocumentsPageServer('INVOICE'),
    getInvoiceStatsServer(),
  ]);

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
      <h1 className="text-2xl md:text-4xl font-semibold font-title">Gérer mes factures et devis</h1>

      {(!estimatesResponse.ok || !invoicesResponse.ok) && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800" role="alert">
          Une partie de vos documents n’a pas pu être chargée. Actualisez la page ou réessayez dans quelques instants.
        </div>
      )}

      <InvoiceStatsOverview stats={invoiceStats} />

      <DocumentsTypeSwitch
        notice={activeCompany?.status === 'CLOSED' && (
          <div className="mt-4 rounded-lg border border-red-100 bg-red-50/70 p-4 text-sm text-zinc-700">
            Cette entreprise est fermée : les factures existantes restent consultables, mais aucune nouvelle facture ne peut être créée.
          </div>
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
      />
    </div>
  )
}

export default DocumentsPage
