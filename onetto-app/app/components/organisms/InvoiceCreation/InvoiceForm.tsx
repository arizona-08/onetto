import React from 'react'
import CustomerDetails from '../../molecules/InvoiceFormComponents/CustomerDetails'
import ServiceLineItems from '../../molecules/InvoiceFormComponents/ServiceLineItems'
import { Client, ServiceLineItem } from '@/app/types';


interface InvoiceFormProps {
  onClientChange: (client: Client | null) => void;
  onLineItemsChange: (lineItems: ServiceLineItem[]) => void;
  onInvoiceDatesChange: (dates: { creationDate: string, dueDate: string }) => void;
}

function InvoiceForm({ onClientChange, onLineItemsChange, onInvoiceDatesChange }: InvoiceFormProps) {
  
  return (
    <div className="">
      <CustomerDetails onClientChange={onClientChange} />
      <ServiceLineItems onLineItemsChange={onLineItemsChange} onInvoiceDatesChange={onInvoiceDatesChange} />
    </div>
  )
}

export default InvoiceForm