import DocumentCreator from '@/app/components/organisms/DocumentCreation/DocumentCreator'
import React from 'react'

async function CreateDocumentPage({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const params = await searchParams;
  const isInvoice = params.type === 'invoice';

  return (
    <div className="mx-auto w-full max-w-6xl p-4">
      <h1 className="text-2xl font-title font-semibold mb-1">
        Création d&apos;une {isInvoice ? 'facture' : 'devis'}
      </h1>
      <p className="text-gray-500 mb-6">
        Créez facilement vos {isInvoice ? 'factures' : 'devis'} à partir des services sélectionnés.
      </p>

      <DocumentCreator mode="create" documentType={isInvoice ? 'INVOICE' : 'ESTIMATE'} />
    </div>
  )
}

export default CreateDocumentPage
