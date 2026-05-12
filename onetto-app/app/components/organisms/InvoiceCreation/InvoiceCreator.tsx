'use client'
import React from 'react'
import InvoiceForm from './InvoiceForm'
import InvoicePreview from './InvoicePreview'
import { Client, ServiceLineItem } from '@/app/types';

function InvoiceCreator() {
  const [client, setClient] = React.useState<Client | null>(null);
  const [lineItems, setLineItems] = React.useState<ServiceLineItem[]>([])
  
  return (
    <div className="">
      <InvoiceForm onClientChange={setClient} onLineItemsChange={setLineItems} />
      <InvoicePreview client={client} lineItems={lineItems} />
    </div>
  )
}

export default InvoiceCreator