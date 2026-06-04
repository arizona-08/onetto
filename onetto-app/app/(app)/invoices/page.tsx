import InvoiceTable from '@/app/components/organisms/InvoiceTable'
import React from 'react'

function invoices() {
  return (
    <div className="w-full p-4">
      <h1 className="text-2xl font-black font-title">Gérer mes factures</h1>

      <InvoiceTable />
    </div>
  )
}

export default invoices