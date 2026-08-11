'use client'
import React, { useEffect, useState } from 'react'
import { Client, Document, DocumentDates, ServiceLineItem } from '@/app/types';
import { DocumentClientError, DocumentDateError, DocumentLineItemsError } from '@/shared/DocumentErrorsTypes';
import { verifyClient, verifyDates, verifyLineItems } from '@/shared/InvoiceValidation';
import { createDocument, sendDocumentToClient, updateDraftDocument } from '@/lib/documents/document';
import { CheckCircle2, Send, X } from 'lucide-react';
import DocumentForm from './DocumentForm';
import DocumentPreview from './DocumentPreview';
import { useToast } from '../../context/ToastContext';
import DocumentVersionSelector from '../../molecules/DocumentVersionSelector';

interface DocumentCreateProps {
  document?: Document,
  mode: 'create' | 'update'
}

function DocumentCreator({ document, mode }: DocumentCreateProps) {
  const [client, setClient] = React.useState<Client | null>(null);
  const [lineItems, setLineItems] = React.useState<ServiceLineItem[]>([])
  const [documentDates, setDocumentDates] = React.useState<DocumentDates>(() =>{
    const d = new Date()
    // set to one month ahead, handling month overflow
    const month = d.getMonth()
    const year = d.getFullYear()
    const day = d.getDate()
    const nextMonth = month + 1
    const dueDate = new Date(year, nextMonth, day)
    return {
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
        dueDate: document.paymentDueAt // à adapter pour les devis avec document.toValidateAt
      })
    }
  }, [document])

  const [documentClientErrors, setDocumentClientErrors] = useState<DocumentClientError | null>(null);
  const [documentLineItemsErrors, setDocumentLineItemsErrors] = useState<DocumentLineItemsError | null>(null);
  const [documentDatesErrors, setDocumentDatesErrors] = useState<DocumentDateError | null>(null);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [successToastType, setSuccessToastType] = useState<'draft' | 'sent'>('draft');
  const [isSending, setIsSending] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const { showToast } = useToast();

  const isLineItemsEmpty = lineItems.length === 0;
  const isInCreationEstimate = document && document?.type === "ESTIMATE" || mode === 'create';
  const isDraftEstimate = document && document?.type === "ESTIMATE" && document?.estimateStatus === "DRAFT";
  const isDraftInvoice = document && document?.type === "INVOICE" && document?.invoiceStatus === "DRAFT";
  const isEditable = document?.isEditable ?? true;
  

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


  async function saveDocument() {
    resetErrors();
    const checkDates = verifyDates(documentDates)
    const checkClient = verifyClient(client);
    const checkLineItems = verifyLineItems(lineItems);

    if(!checkClient.ok){
      setDocumentClientErrors(checkClient.error)
      console.error(checkClient.error);
      return null;
    }

    if(!checkDates.ok){
      setDocumentDatesErrors(checkDates.error)
      console.error(checkDates.error);
      return null;
    }

    if(!checkLineItems.ok){
      setDocumentLineItemsErrors(checkLineItems.error)
      return null;
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
      return null;
    }

    if (!response.data.document) {
      showToast("Le devis a été enregistré, mais son envoi est impossible.", "error");
      return null;
    }

    return response.data.document;
  }

  async function handleSaveDraft(e: React.MouseEvent<HTMLButtonElement>) {
    e.preventDefault();
    const savedDocument = await saveDocument();
    if (!savedDocument) return;

    setSuccessToastType('draft');
    setShowSuccessToast(true);
  }

  async function handleConfirmAndSend(e: React.MouseEvent<HTMLButtonElement>) {
    e.preventDefault();
    setIsSending(true);
    const savedDocument = await saveDocument();

    if (!savedDocument) {
      setIsSending(false);
      return;
    }

    const response = await sendDocumentToClient(savedDocument.id);
    setIsSending(false);

    if (!response.ok) {
      showToast("Le devis est enregistré, mais l’envoi au client a échoué.", "error");
      return;
    }

    setSuccessToastType('sent');
    setIsSent(true);
    setShowSuccessToast(true);

  }

  
  
  return (
    <div className="relative bg-white p-4 rounded-md w-full max-w-6xl mx-auto overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-1 bg-primary opacity-75"></div>

      {document && <div className="mb-5 flex items-center justify-between gap-4"><DocumentVersionSelector documentId={document.id} versionNumber={document.versionNumber} mode="edit" />{!isEditable && <p className="text-sm font-medium text-zinc-500">Cette version est en lecture seule.</p>}</div>}

      <fieldset disabled={!isEditable} className={!isEditable ? 'opacity-50' : undefined}>
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
          documentDates={documentDates}
        />
      </fieldset>

      <DocumentPreview
        type="estimate"
        client={client}
        lineItems={lineItems}
        documentDates={documentDates}
        creationDate={document?.createdAt ?? new Date().toISOString()}
      />

      <div className="w-full max-w-2xl mx-auto mt-12 flex flex-col-reverse items-stretch justify-between gap-3 sm:flex-row-reverse sm:items-center">
        <button
          type="button"
          disabled={isLineItemsEmpty || isSending || isSent || !isEditable}
          onClick={handleConfirmAndSend}
          className="disabled:cursor-not-allowed flex items-center justify-center gap-2 rounded-md bg-primary px-3 py-2 text-white disabled:opacity-45"
        >
         {(isInCreationEstimate || isDraftEstimate) && (isSent ? 'Devis envoyé' : isSending ? 'Envoi du devis…' : 'Confirmer et envoyer le devis')}
         {isDraftInvoice && 'Confirmer et envoyer la facture'}
         
          <Send className="h-4 w-4" aria-hidden="true" />
        </button>

        <button
          type="button"
          disabled={isLineItemsEmpty || isSending || isSent || !isEditable}
          className="disabled:cursor-not-allowed disabled:opacity-45 rounded-md border border-primary bg-white px-3 py-2 font-semibold text-primary transition-colors duration-150 hover:bg-primary/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          onClick={handleSaveDraft}
        >
          Enregistrer en tant que brouillon
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
            <p className="font-title text-sm font-bold">{successToastType === 'sent' ? 'Devis envoyé' : 'Brouillon enregistré'}</p>
            <p className="mt-0.5 text-xs leading-relaxed text-emerald-50">
              {successToastType === 'sent' ? 'Le devis et son lien de négociation ont été envoyés au client.' : 'Le brouillon du devis a bien été enregistré.'}
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
