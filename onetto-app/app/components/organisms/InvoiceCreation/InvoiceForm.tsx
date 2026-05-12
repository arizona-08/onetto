import React from 'react'
import CustomerDetails from '../../molecules/InvoiceFormComponents/CustomerDetails'
import ServiceLineItems from '../../molecules/InvoiceFormComponents/ServiceLineItems'
import { Client } from '@/app/types';


interface InvoiceFormProps {
  onClientChange: (client: Client | null) => void;
}

function InvoiceForm({ onClientChange }: InvoiceFormProps) {
  function handleClientChange(client: Client | null) {
    onClientChange(client);
  }

  
  return (
    <div className="">
      <CustomerDetails onClientChange={handleClientChange} />
      <ServiceLineItems />
    </div>
  )
}

export default InvoiceForm