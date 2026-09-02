import DocumentCreator from '@/app/components/organisms/DocumentCreation/DocumentCreator';
import { getDocumentByIdServer } from '@/lib/documents/document.server';
import React from 'react'
import Link from 'next/link';

// Pour modifier les brouillons uniquement
async function UpdateDraftPage({ params } : { params : Promise<{id: string}>}) {
  const fetchedParams = await params;
  const id = fetchedParams.id

  const documentResult = await getDocumentByIdServer(id);
  if(!documentResult.ok){
    return (
      <div className="mx-auto w-full max-w-6xl p-4">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800" role="alert">
          <p>Ce brouillon n’a pas pu être chargé pour modification. Actualisez la page ou réessayez plus tard.</p>
          <Link href="/documents" className="mt-3 inline-block font-semibold underline">Retour aux factures et devis</Link>
        </div>
      </div>
    );
  }

  const document = documentResult.data;
  return (
    <div className="mx-auto w-full max-w-6xl p-4">
      <DocumentCreator mode="update" document={document} />
    </div>
  );
}

export default UpdateDraftPage
