import React from 'react'
import CustomerDetails from '../../molecules/InvoiceFormComponents/CustomerDetails'
import ServiceLineItems from '../../molecules/InvoiceFormComponents/ServiceLineItems'
import { Client, ServiceLineItem } from '@/app/types';
import { InvoiceClientError, InvoiceDateError, InvoiceLineItemsError } from '@/shared/invoiceErrorsTypes';


interface InvoiceFormProps {
  onClientChange: (client: Client | null) => void;
  onLineItemsChange: (lineItems: ServiceLineItem[]) => void;
  onInvoiceDatesChange: (dates: { creationDate: string, dueDate: string }) => void;
  errors?: {
    invoiceDateErrors?: InvoiceDateError,
    invoiceClientErrors?: InvoiceClientError,
    invoiceLineItemsErrors?: InvoiceLineItemsError
  }
}

function InvoiceForm({ onClientChange, onLineItemsChange, onInvoiceDatesChange, errors }: InvoiceFormProps) {
  
  return (
    <div className="">
      <CustomerDetails onClientChange={onClientChange} invoiceClientErrors={errors?.invoiceClientErrors} />
      <ServiceLineItems onLineItemsChange={onLineItemsChange} onInvoiceDatesChange={onInvoiceDatesChange} invoiceDateErrors={errors?.invoiceDateErrors} invoiceLineItemsErrors={errors?.invoiceLineItemsErrors} />
    </div>
  )
}

export default InvoiceForm