import DocumentDisplayComponent from '@/app/components/molecules/DocumentDisplayComponent/DocumentDisplayComponent';
import { getDocumentByIdServer } from '@/lib/documents/document.server';
import { Edit, Send, Trash } from 'lucide-react';
import Link from 'next/link';

import React from 'react'

async function ShowDocumentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const documentResponse = await getDocumentByIdServer(id, true);

  if(!documentResponse.ok){
    console.error("Erreur lors de la récupération de la facture ", documentResponse.error)
    throw new Error("Erreur lors de la récupération de la facture ")
  }

  const document = documentResponse.data;
  
  const isDraftEstimate = document.type === "ESTIMATE" && document.estimateStatus === "DRAFT";
  const isRejectedEstimate = document.type === "ESTIMATE" && document.estimateStatus === "REJECTED";

  const isDraftInvoice = document.type === "INVOICE" && document.invoiceStatus === "DRAFT";

  let editLink;

  if(isDraftEstimate){
    editLink = `/documents/${document.id}/update-draft`;
  } else if(isRejectedEstimate){
    editLink = `/documents/${document.id}/update-sent`;
  }

  return (
    <div className="p-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black font-title">Détails {(isDraftEstimate || isRejectedEstimate) ? "du devis" : "de la facture"} {document.documentNumber}</h1>
        
        {/* actions */}
        <div className="flex items-center justify-between gap-12 text-sm">
          {(isDraftEstimate || isDraftInvoice) && (
            <button
              className="px-4 py-2 text-red-500 border border-red-500 hover:bg-red-500 hover:text-white rounded-md flex items-center gap-1 cursor-pointer transition-all duration-150"
            >
              Supprimer <Trash className="w-4 h-4" />
            </button>
          )}

          <div className="modify-and-confirm flex items-center justify-between gap-4">
            {isDraftEstimate && (
              <Link
                href={ editLink || '#' } className="px-4 py-2 text-primary border border-primary hover:bg-primary hover:text-white  rounded-md flex items-center gap-1 cursor-pointer transition-all duration-150"
              >
                Modifier
                <Edit className="w-4 h-4" />
              </Link>
            )}

            {(isDraftEstimate || isDraftInvoice) && (
              <button
                className="px-4 py-2 text-white bg-primary border border-primary hover:bg-primary/90 rounded-md flex items-center gap-1 cursor-pointer transition-all duration-150"
              >
                Confirmer et envoyer <Send />
              </button>
            )}
          </div>
        </div>
      </div>

      <DocumentDisplayComponent document={document} />
    </div>
  )
}

export default ShowDocumentPage