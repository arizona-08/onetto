import DocumentDisplayComponent from '@/app/components/molecules/DocumentDisplayComponent/DocumentDisplayComponent';
import ShowDocument from '@/app/components/organisms/ShowDocument';
import { sendDocumentToClient } from '@/lib/documents/document';
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
  
  return (
    <ShowDocument document={document} />
  )
}

export default ShowDocumentPage