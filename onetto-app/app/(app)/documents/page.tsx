import {
  getDocumentsPageServer,
  getInvoiceStatsServer,
  InvoiceStats,
} from "@/lib/documents/document.server";
import { getMyCompaniesServer } from "@/lib/companies/companies.server";
import DocumentsTable from "@/app/components/organisms/DocumentsTable";
import DocumentsTypeSwitch from "@/app/components/organisms/DocumentsTypeSwitch";
import InvoiceStatsOverview from "@/app/components/organisms/InvoiceStatsOverview";
import { Plus } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

const emptyStats: InvoiceStats = {
  paid: { count: 0, totalAmount: 0 },
  pending: { count: 0, totalAmount: 0 },
  overdue: { count: 0, totalAmount: 0 },
  draft: { count: 0, totalAmount: 0 },
};

async function DocumentsPage() {
  const [estimatesResponse, invoicesResponse, invoiceStatsResponse] =
    await Promise.all([
      getDocumentsPageServer("ESTIMATE"),
      getDocumentsPageServer("INVOICE"),
      getInvoiceStatsServer(),
    ]);

  const estimates = estimatesResponse.ok
    ? estimatesResponse.data.documents
    : [];
  const invoices = invoicesResponse.ok ? invoicesResponse.data.documents : [];
  const invoiceStats = invoiceStatsResponse.ok
    ? invoiceStatsResponse.data
    : emptyStats;

  const companiesResponse = await getMyCompaniesServer();
  const activeCompany = companiesResponse.ok
    ? companiesResponse.data.companies.find(
        (company) => company.id === companiesResponse.data.activeCompanyId,
      )
    : undefined;
  const currentDate = new Date().toISOString();
  const canCreate = activeCompany?.status !== "CLOSED";

  return (
    <div className="mx-auto w-full max-w-[1500px] px-4 py-6 sm:px-8 sm:py-8 lg:px-10 lg:py-10 2xl:px-12">
      <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-ui-secondary">Ventes</p>
          <h1 className="mt-1 font-title text-3xl font-semibold tracking-tight text-ui-text sm:text-4xl">
            Gérer mes factures et devis
          </h1>
        </div>
        {canCreate && (
          <div className="flex flex-wrap gap-2 sm:justify-end">
            <Link href="/documents/create" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-ui-control border border-ui-border bg-ui-surface px-4 py-2 text-sm font-semibold text-ui-text transition-colors hover:bg-ui-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ui-primary">
              <Plus className="h-4 w-4" aria-hidden="true" /> Nouveau devis
            </Link>
            <Link href="/documents/create?type=invoice" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-ui-control bg-ui-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-ui-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ui-primary">
              <Plus className="h-4 w-4" aria-hidden="true" /> Nouvelle facture
            </Link>
          </div>
        )}
      </header>

      {(!estimatesResponse.ok || !invoicesResponse.ok) && (
        <div
          className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800"
          role="alert"
        >
          Une partie de vos documents n’a pas pu être chargée. Actualisez la
          page ou réessayez dans quelques instants.
        </div>
      )}

      <InvoiceStatsOverview stats={invoiceStats} />

      <DocumentsTypeSwitch
        key={activeCompany?.id ?? "no-active-company"}
        notice={
          activeCompany?.status === "CLOSED" && (
            <div className="mt-4 rounded-lg border border-red-100 bg-red-50/70 p-4 text-sm text-zinc-700">
              Cette entreprise est fermée : les factures existantes restent
              consultables, mais aucune nouvelle facture ne peut être créée.
            </div>
          )
        }
        invoices={
          <section aria-labelledby="invoices-heading">
            <h2 id="invoices-heading" className="font-title text-xl font-semibold text-ui-text">
              Factures
            </h2>
            <DocumentsTable
              type="invoices"
              documents={invoices}
              currentDate={currentDate}
              initialPagination={
                invoicesResponse.ok
                  ? invoicesResponse.data.pagination
                  : undefined
              }
            />
          </section>
        }
        estimates={
          <section aria-labelledby="estimates-heading">
            <h2 id="estimates-heading" className="font-title text-xl font-semibold text-ui-text">
              Devis
            </h2>
            <DocumentsTable
              type="estimates"
              documents={estimates}
              currentDate={currentDate}
              initialPagination={
                estimatesResponse.ok
                  ? estimatesResponse.data.pagination
                  : undefined
              }
            />
          </section>
        }
      />
    </div>
  );
}

export default DocumentsPage;
