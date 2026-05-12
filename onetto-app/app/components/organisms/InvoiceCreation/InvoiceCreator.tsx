'use client'
import React from 'react'
import InvoiceForm from './InvoiceForm'
import InvoicePreview from './InvoicePreview'
import { Client } from '@/app/types';

function InvoiceCreator() {
  const [client, setClient] = React.useState<Client | null>(null);
  
  return (
    <div className="">
      <InvoiceForm onClientChange={setClient} />
      <InvoicePreview client={client} />
    </div>
  )
}

export default InvoiceCreator