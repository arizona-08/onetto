import DocumentCreator from "@/app/components/organisms/DocumentCreation/DocumentCreator";
import { getDocumentByIdServer } from "@/lib/documents/document.server";
import React from "react";
import Link from "next/link";

// Pour modifier les brouillons uniquement
async function UpdateDraftPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const fetchedParams = await params;
  const id = fetchedParams.id;

  const documentResult = await getDocumentByIdServer(id);
  if (!documentResult.ok) {
    return (
      <div className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">
        <div
          className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800"
          role="alert"
        >
          <p>
            Ce brouillon n’a pas pu être chargé pour modification. Actualisez la
            page ou réessayez plus tard.
          </p>
          <Link
            href="/documents"
            className="mt-3 inline-block font-semibold underline"
          >
            Retour aux factures et devis
          </Link>
        </div>
      </div>
    );
  }

  const document = documentResult.data;
  const isInvoice = document.type === "INVOICE";
  return (
    <div className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-wrap items-center gap-4 sm:gap-6">
        <div>
          <p className="mb-1 text-sm font-medium text-ui-secondary">Ventes / Modifier un document</p>
          <h1 className="font-title text-2xl font-semibold text-ui-text sm:text-3xl">
            Modifier {isInvoice ? "la facture" : "le devis"}
          </h1>
          <p className="mt-1 text-sm text-ui-secondary">
            Modifiez les informations autorisées et consultez l’aperçu en direct.
          </p>
        </div>
        <span className="inline-flex items-center rounded-ui-control border border-ui-border bg-ui-primary-soft px-4 py-2 text-sm font-semibold text-ui-primary">
          {isInvoice ? "Facture" : "Devis"} · {document.documentNumber}
        </span>
      </div>
      <DocumentCreator mode="update" document={document} editorLayout />
    </div>
  );
}

export default UpdateDraftPage;
