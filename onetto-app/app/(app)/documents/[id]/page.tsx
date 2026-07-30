import DocumentDisplayComponent from '@/app/components/molecules/DocumentDisplayComponent/DocumentDisplayComponent';
import { getDocumentByIdServer } from '@/lib/documents/invoice.server';

import React from 'react'

async function ShowDocumentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const documentResponse = await getDocumentByIdServer(id, true);

  if(!documentResponse.ok){
    console.error("Erreur lors de la récupération de la facture ", documentResponse.error)
    throw new Error("Erreur lors de la récupération de la facture ")
  }

  const document = documentResponse.data;
  console.log(document.services);
  
  return (
    <div className="p-5">
      <h1 className="text-2xl font-black font-title">Détails de la facture {document.documentNumber}</h1>

      <DocumentDisplayComponent document={document} />
    </div>
  )
}

export default ShowDocumentPage