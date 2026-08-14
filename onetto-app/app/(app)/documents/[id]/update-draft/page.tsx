import DocumentCreator from '@/app/components/organisms/DocumentCreation/DocumentCreator';
import { getDocumentByIdServer } from '@/lib/documents/document.server';
import React from 'react'

// Pour modifier les brouillons uniquement
async function UpdateDraftPage({ params } : { params : Promise<{id: string}>}) {
  const fetchedParams = await params;
  const id = fetchedParams.id

  const documentResult = await getDocumentByIdServer(id);
  if(!documentResult.ok){
    console.error(documentResult.error);
    return;
  }

  const document = documentResult.data;
  return (
    <div className="mx-auto w-full max-w-6xl p-4">
      <DocumentCreator mode="update" document={document} />
    </div>
  );
}

export default UpdateDraftPage
