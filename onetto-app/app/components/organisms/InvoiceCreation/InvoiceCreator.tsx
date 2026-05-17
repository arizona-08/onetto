'use client'
import React from 'react'
import InvoiceForm from './InvoiceForm'
import InvoicePreview from './InvoicePreview'
import { Client, ServiceLineItem } from '@/app/types';

function InvoiceCreator() {
  const [client, setClient] = React.useState<Client | null>(null);
  const [lineItems, setLineItems] = React.useState<ServiceLineItem[]>([])
  const [invoiceDates, setInvoiceDates] = React.useState(() =>{
    const d = new Date()
    // set to one month ahead, handling month overflow
    const month = d.getMonth()
    const year = d.getFullYear()
    const day = d.getDate()
    const nextMonth = month + 1
    const creationDate = d.toISOString().split('T')[0]
    const dueDate = new Date(year, nextMonth, day)
    return {
      creationDate,
      dueDate: dueDate.toISOString().split('T')[0]
    }
  })
  
  return (
    <div className="">
      <InvoiceForm onClientChange={setClient} onLineItemsChange={setLineItems} onInvoiceDatesChange={setInvoiceDates} />
      <InvoicePreview client={client} lineItems={lineItems} invoiceDates={invoiceDates} />
    </div>
  )
}

export default InvoiceCreator