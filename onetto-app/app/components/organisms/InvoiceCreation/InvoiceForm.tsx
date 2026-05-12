import React from 'react'
import CustomerDetails from '../../molecules/InvoiceFormComponents/CustomerDetails'
import ServiceLineItems from '../../molecules/InvoiceFormComponents/ServiceLineItems'
import { Client, ServiceLineItem } from '@/app/types';


interface InvoiceFormProps {
  onClientChange: (client: Client | null) => void;
  onLineItemsChange: (lineItems: ServiceLineItem[]) => void;
}

function InvoiceForm({ onClientChange, onLineItemsChange }: InvoiceFormProps) {
  
  return (
    <div className="">
      <CustomerDetails onClientChange={onClientChange} />
      <ServiceLineItems onLineItemsChange={onLineItemsChange} />
    </div>
  )
}

export default InvoiceForm