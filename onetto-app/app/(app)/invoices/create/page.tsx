import InvoiceForm from '@/app/components/organisms/InvoiceForm'
import React from 'react'

function CreateInvoicePage() {
  return (
    <div>
      <h1 className="text-2xl font-title font-black mb-1">Création d'une facture</h1>
      <p className="text-gray-500 mb-6">Créez facilement vos factures à partir des services sélectionnés.</p>

      <div className="relative bg-white p-4 rounded-md w-full max-w-300 overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-secondary opacity-50"></div>
        
        <InvoiceForm />
      </div>

    </div>
  )
}

export default CreateInvoicePage