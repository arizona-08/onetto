import DocumentCreator from "@/app/components/organisms/DocumentCreation/DocumentCreator";
import React from "react";
import Link from "next/link";

async function CreateDocumentPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const params = await searchParams;
  const isInvoice = params.type === "invoice";

  return (
    <div className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-wrap items-center gap-4 sm:gap-6">
        <div>
          <p className="mb-1 text-sm font-medium text-ui-secondary">Ventes / Nouveau document</p>
          <h1 className="font-title text-2xl font-semibold text-ui-text sm:text-3xl">
            {isInvoice ? "Nouvelle facture" : "Nouveau devis"}
          </h1>
          <p className="mt-1 text-sm text-ui-secondary">
            Créez facilement vos {isInvoice ? "factures" : "devis"} à partir des services sélectionnés.
          </p>
        </div>
        <nav className="inline-flex items-center gap-1 rounded-ui-control border border-ui-border bg-ui-surface p-1" aria-label="Type de document">
          <Link href="/documents/create?type=invoice" aria-current={isInvoice ? "page" : undefined} className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${isInvoice ? "bg-ui-primary-soft text-ui-primary shadow-sm" : "text-ui-secondary hover:bg-ui-subtle"}`}>Facture</Link>
          <Link href="/documents/create?type=estimate" aria-current={!isInvoice ? "page" : undefined} className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${!isInvoice ? "bg-ui-primary-soft text-ui-primary shadow-sm" : "text-ui-secondary hover:bg-ui-subtle"}`}>Devis</Link>
        </nav>
      </div>

      <DocumentCreator
        mode="create"
        documentType={isInvoice ? "INVOICE" : "ESTIMATE"}
      />
    </div>
  );
}

export default CreateDocumentPage;
