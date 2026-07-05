'use client'
import React, { useState } from 'react'
import InvoiceForm from './InvoiceForm'
import InvoicePreview from './InvoicePreview'
import { Client, ServiceLineItem } from '@/app/types';
import { InvoiceClientError, InvoiceDateError, InvoiceLineItemsError } from '@/shared/invoiceErrorsTypes';
import { verifyClient, verifyDates, verifyLineItems } from '@/shared/InvoiceValidation';
import { createInvoice } from '@/lib/invoices/invoices';

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

  const [invoiceClientErrors, setInvoiceClientErrors] = useState<InvoiceClientError | null>(null);
  const [invoiceLineItemsErrors, setInvoiceLineItemsErrors] = useState<InvoiceLineItemsError | null>(null);
  const [invoiceDatesErrors, setInvoiceDatesErrors] = useState<InvoiceDateError | null>(null);

  function resetErrors() {
    setInvoiceClientErrors(null);
    setInvoiceLineItemsErrors(null);
    setInvoiceDatesErrors(null);
  }
  async function handleConfirmInvoice(e: React.MouseEvent<HTMLButtonElement>){
    e.preventDefault();

    resetErrors();
    const checkDates = verifyDates(invoiceDates)
    const checkClient = verifyClient(client);
    const checkLineItems = verifyLineItems(lineItems);

    if(!checkClient.ok){
      setInvoiceClientErrors(checkClient.error)
      console.log(checkClient.error);
      return;
    }

    if(!checkDates.ok){
      setInvoiceDatesErrors(checkDates.error)
      console.log(checkDates.error);
      return;
    }

    if(!checkLineItems.ok){
      setInvoiceLineItemsErrors(checkLineItems.error)
      return;
    }

    const {id, ...clientData} = client as Client;

    const response = await createInvoice({
      client: clientData,
      lineItems,
      invoiceDates
    });

    if(!response.ok) {
      console.error("Erreur lors de la création de la facture", response.error);
      return
    }

    console.log("Facture créée avec succès", response.data);

  }

  
  
  return (
    <div className="relative bg-white p-4 rounded-md w-full max-w-6xl mx-auto overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-1 bg-primary opacity-75"></div>

      <InvoiceForm
        onClientChange={setClient}
        onLineItemsChange={setLineItems}
        onInvoiceDatesChange={setInvoiceDates}
        errors={{
          invoiceDateErrors: invoiceDatesErrors as InvoiceDateError | undefined,
          invoiceClientErrors: invoiceClientErrors as InvoiceClientError | undefined,
          invoiceLineItemsErrors: invoiceLineItemsErrors as InvoiceLineItemsError | undefined
        }}
      />

      <InvoicePreview
        client={client}
        lineItems={lineItems}
        invoiceDates={invoiceDates}
      />

      <div className="flex items-center justify-end mt-4">
        <button
          className="px-3 py-2 rounded-md text-white bg-primary hover:bg-primary-hover transition-colors duration-150"
          onClick={handleConfirmInvoice}
        >
          Envoyer la facture
        </button>
      </div>
    </div>
  )
}

export default InvoiceCreator