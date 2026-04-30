import InvoiceTable from '@/app/components/organisms/InvoiceTable'
import React from 'react'

function invoices() {
  return (
    <div>
      <h1 className="text-2xl font-black font-title">Gérer mes factures</h1>

      <InvoiceTable />
    </div>
  )
}

export default invoices