'use client'
import React, { useEffect, useState } from 'react'
import { Client, Document, ServiceLineItem } from '@/app/types';
import { DocumentClientError, DocumentDateError, DocumentLineItemsError } from '@/shared/DocumentErrorsTypes';
import { verifyClient, verifyDates, verifyLineItems } from '@/shared/InvoiceValidation';
import { createDocument, updateDraftDocument } from '@/lib/documents/document';
import { CheckCircle2, X } from 'lucide-react';
import DocumentForm from './DocumentForm';
import DocumentPreview from './DocumentPreview';

interface DocumentCreateProps {
  document?: Document,
  mode: 'create' | 'update'
}

function DocumentCreator({ document, mode }: DocumentCreateProps) {
  const [client, setClient] = React.useState<Client | null>(null);
  const [lineItems, setLineItems] = React.useState<ServiceLineItem[]>([])
  const [documentDates, setDocumentDates] = React.useState(() =>{
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

  useEffect(() => {
    if(document) {
      setClient({
        id: 'TEMP-ID',
        name: document.clientName,
        email: document.clientEmail,
        address: document.clientAddress,
        city: document.clientCity,
        postalCode: document.clientPostalCode,
        country: document.clientCountry
      });

      setLineItems(document.services ? document.services?.map(service => ({
        id: service.id,
        description: service.description,
        taxRate: service.taxRate,
        unit: service.unit,
        quantity: service.quantity,
        unitPrice: service.unitPrice
      })) : []);

      setDocumentDates({
        creationDate: document.createdAt,
        dueDate: document.paymentDueAt // à adapter pour les devis avec document.toValidateAt
      })
    }
  }, [document])

  const [documentClientErrors, setDocumentClientErrors] = useState<DocumentClientError | null>(null);
  const [documentLineItemsErrors, setDocumentLineItemsErrors] = useState<DocumentLineItemsError | null>(null);
  const [documentDatesErrors, setDocumentDatesErrors] = useState<DocumentDateError | null>(null);
  const [showSuccessToast, setShowSuccessToast] = useState(false);

  React.useEffect(() => {
    if (!showSuccessToast) return;

    const timeout = window.setTimeout(() => setShowSuccessToast(false), 5000);
    return () => window.clearTimeout(timeout);
  }, [showSuccessToast]);

  function resetErrors() {
    setDocumentClientErrors(null);
    setDocumentLineItemsErrors(null);
    setDocumentDatesErrors(null);
  }


  async function handleSaveDraft(e: React.MouseEvent<HTMLButtonElement>){
    e.preventDefault();

    resetErrors();
    const checkDates = verifyDates(documentDates)
    const checkClient = verifyClient(client);
    const checkLineItems = verifyLineItems(lineItems);

    if(!checkClient.ok){
      setDocumentClientErrors(checkClient.error)
      console.error(checkClient.error);
      return;
    }

    if(!checkDates.ok){
      setDocumentDatesErrors(checkDates.error)
      console.error(checkDates.error);
      return;
    }

    if(!checkLineItems.ok){
      setDocumentLineItemsErrors(checkLineItems.error)
      return;
    }

    const { name, email, address, city, postalCode, country } = client as Client;
    const clientData = { name, email, address, city, postalCode, country };

    let response;

    if(mode === 'create') {
      response = await createDocument({
        client: clientData,
        lineItems,
        documentDates
      });
    } else {
      response = await updateDraftDocument(document?.id as string, {
        client: clientData,
        lineItems,
        documentDates,
      });
    }

    if(!response.ok) {
      console.error("Erreur lors de la création de la facture", response.error);
      return
    }

    setShowSuccessToast(true);
    console.log("Facture créée avec succès", response.data);

  }

  
  
  return (
    <div className="relative bg-white p-4 rounded-md w-full max-w-6xl mx-auto overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-1 bg-primary opacity-75"></div>

      <DocumentForm
        onClientChange={setClient}
        onLineItemsChange={setLineItems}
        onDocumentDatesChange={setDocumentDates}
        errors={{
          documentDateErrors: documentDatesErrors as DocumentDateError | undefined,
          documentClientErrors: documentClientErrors as DocumentClientError | undefined,
          documentLineItemsErrors: documentLineItemsErrors as DocumentLineItemsError | undefined
        }}
        client={client}
        lineItems={lineItems}
      />

      <DocumentPreview
        type="estimate"
        client={client}
        lineItems={lineItems}
        documentDates={documentDates}
      />

      <div className="mt-4 flex flex-col-reverse items-stretch justify-end gap-3 sm:flex-row sm:items-center">
        <button
          type="button"
          disabled
          title="L’envoi des factures sera bientôt disponible"
          className="cursor-not-allowed rounded-md bg-primary px-3 py-2 text-white opacity-45"
        >
          Envoyer la facture
        </button>

        <button
          type="button"
          className="rounded-md border border-primary bg-white px-3 py-2 font-semibold text-primary transition-colors duration-150 hover:bg-primary/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          onClick={handleSaveDraft}
        >
          Enregistrer le brouillon
        </button>
      </div>

      {showSuccessToast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-5 right-5 z-50 flex w-[calc(100%-2.5rem)] max-w-sm items-start gap-3 rounded-xl border border-emerald-400/40 bg-emerald-600 px-4 py-3.5 text-white shadow-[0_18px_45px_-15px_rgba(5,150,105,0.65)] animate-in slide-in-from-bottom-3 fade-in duration-300 sm:bottom-6 sm:right-6"
        >
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/15 ring-1 ring-white/20">
            <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
          </span>

          <div className="min-w-0 flex-1">
            <p className="font-title text-sm font-bold">Brouillon enregistré</p>
            <p className="mt-0.5 text-xs leading-relaxed text-emerald-50">
              Le brouillon de la facture a bien été enregistré.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowSuccessToast(false)}
            className="rounded-md p-1 text-emerald-50 transition-colors hover:bg-white/15 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            aria-label="Fermer la notification"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  )
}

export default DocumentCreator
