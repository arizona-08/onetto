import InvoiceDisplayComponent from '@/app/components/molecules/InvoiceDisplayComponent/InvoiceDisplayComponent'
import { getInvoiceByIdServer } from '@/lib/invoices/invoice.server';
import React from 'react'

async function ShowInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const invoiceResponse = await getInvoiceByIdServer(id, true);
  if(!invoiceResponse.ok){
    console.error("Erreur lors de la récupération de la facture ", invoiceResponse.error)
    throw new Error("Erreur lors de la récupération de la facture ")
  }

  const invoice = invoiceResponse.data;
  console.log(invoice.services);
  
  return (
    <div className="p-5">
      <h1 className="text-2xl font-black font-title">Détails de la facture {invoice.invoiceNumber}</h1>

      <InvoiceDisplayComponent invoice={invoice} />
    </div>
  )
}

export default ShowInvoicePage