import InvoiceCreator from '@/app/components/organisms/InvoiceCreation/InvoiceCreator'
import React from 'react'

function CreateInvoicePage() {
  return (
    <div className="w-full p-4">
      <h1 className="text-2xl font-title font-black mb-1">Création d'une facture</h1>
      <p className="text-gray-500 mb-6">Créez facilement vos factures à partir des services sélectionnés.</p>

      <InvoiceCreator />
      

    </div>
  )
}

export default CreateInvoicePage