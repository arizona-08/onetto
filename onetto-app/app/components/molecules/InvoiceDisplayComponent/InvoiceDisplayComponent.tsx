"use client";
import { Invoice } from '@/app/types'
import React from 'react'

interface InvoiceDisplayComponentProps {
  invoice: Invoice;
}


function InvoiceDisplayComponent({ invoice }: InvoiceDisplayComponentProps) {
  const [invoiceData, setInvoiceData] = React.useState<Invoice>(invoice);
  return (
    <div>
      {/* Invoice header */}
      <div>
        <h1>{invoiceData.invoiceNumber}</h1>
        {/* Logo */}
        <h1>Onetto</h1>
      </div>

      {/* Invoice body */}
      <div>
        
      </div>
    </div>
  )
}

export default InvoiceDisplayComponent