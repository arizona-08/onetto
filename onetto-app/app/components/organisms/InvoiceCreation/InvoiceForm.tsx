import React from 'react'
import CustomerDetails from '../../molecules/InvoiceFormComponents/CustomerDetails'
import ServiceLineItems from '../../molecules/InvoiceFormComponents/ServiceLineItems'
import { Client, ServiceLineItem } from '@/app/types';
import { InvoiceClientError, InvoiceDateError } from '@/shared/invoiceErrorsTypes';


interface InvoiceFormProps {
  onClientChange: (client: Client | null) => void;
  onLineItemsChange: (lineItems: ServiceLineItem[]) => void;
  onInvoiceDatesChange: (dates: { creationDate: string, dueDate: string }) => void;
  errors?: {
    invoiceDateErrors?: InvoiceDateError,
    invoiceClientErrors?: InvoiceClientError
  }
}

function InvoiceForm({ onClientChange, onLineItemsChange, onInvoiceDatesChange, errors }: InvoiceFormProps) {
  
  return (
    <div className="">
      <CustomerDetails onClientChange={onClientChange} invoiceClientErrors={errors?.invoiceClientErrors} />
      <ServiceLineItems onLineItemsChange={onLineItemsChange} onInvoiceDatesChange={onInvoiceDatesChange} invoiceDateErrors={errors?.invoiceDateErrors} />
    </div>
  )
}

export default InvoiceForm