'use client'
import React, { useEffect, useState } from 'react'
import { Client, Document, DocumentDates, ServiceLineItem } from '@/app/types';
import { DocumentClientError, DocumentDateError, DocumentLineItemsError } from '@/shared/DocumentErrorsTypes';
import { verifyClient, verifyDates, verifyLineItems } from '@/shared/InvoiceValidation';
import { createDocument, sendDocumentToClient, updateDraftDocument } from '@/lib/documents/document';
import { getActiveCompanyPlanAccess } from '@/lib/companies/companies';
import { CheckCircle2, Send, X } from 'lucide-react';
import DocumentForm from './DocumentForm';
import DocumentPreview from './DocumentPreview';
import { useToast } from '../../context/ToastContext';
import DocumentVersionSelector from '../../molecules/DocumentVersionSelector';
import GoCardlessReconnectModal from '../../molecules/GoCardlessReconnectModal';
import { isGoCardlessAccessTokenInactive } from '@/lib/gocardless/access-token';
import { useActiveCompany } from '../../context/ActiveCompanyContext';

function toDateInputValue(date: Date) {
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
}

function addCalendarWeeks(dateValue: string, weeks: number) {
  const [year, month, day] = dateValue.split('-').map(Number);
  return toDateInputValue(new Date(year, month - 1, day + weeks * 7));
}

function buildInstalmentPreview(totalInCents: number, count: 2 | 3, firstDueDate: string) {
  if (!firstDueDate) return [];
  const base = Math.floor(totalInCents / count);
  const remainder = totalInCents % count;
  return Array.from({ length: count }, (_, index) => ({
    sequence: index + 1,
    amountInCents: base + (index < remainder ? 1 : 0),
    dueDate: addCalendarWeeks(firstDueDate, index),
  }));
}

interface DocumentCreateProps {
  document?: Document;
  mode: 'create' | 'update';
  documentType?: 'ESTIMATE' | 'INVOICE';
}

function DocumentCreator({ document, mode, documentType = 'ESTIMATE' }: DocumentCreateProps) {
  const [client, setClient] = React.useState<Client | null>(null);
  const [lineItems, setLineItems] = React.useState<ServiceLineItem[]>([])
  const operationNature = React.useMemo<'GOODS' | 'SERVICES' | 'MIXED'>(() => {
    const itemTypes = new Set(lineItems.map((lineItem) => lineItem.itemType ?? 'SERVICES'));
    if (itemTypes.has('GOODS') && itemTypes.has('SERVICES')) return 'MIXED';
    return itemTypes.has('GOODS') ? 'GOODS' : 'SERVICES';
  }, [lineItems]);
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
  const [paymentMode, setPaymentMode] = useState<'ONE_TIME' | 'INSTALMENTS'>('ONE_TIME');
  const [numberOfInstalments, setNumberOfInstalments] = useState<2 | 3>(2);
  const [firstDueDate, setFirstDueDate] = useState(() => addCalendarWeeks(toDateInputValue(new Date()), 1));
  const [canUseInstalments, setCanUseInstalments] = useState(false);
  const [goCardlessReconnectCompanyId, setGoCardlessReconnectCompanyId] = useState<string | null>(null);

  useEffect(() => {
    async function loadPlanAccess() {
      const response = await getActiveCompanyPlanAccess();
      setCanUseInstalments(response.ok && response.data.features.instalments);
    }
    void loadPlanAccess();
  }, []);

  useEffect(() => {
    if(document) {
      setClient({
        id: document.id ?? 'TEMP-ID',
        name: document.clientName,
        email: document.clientEmail,
        address: document.clientAddress,
        city: document.clientCity,
        postalCode: document.clientPostalCode,
        country: document.clientCountry,
        clientType: document.clientType === 'BUSINESS' ? 'BUSINESS' : 'CLIENT',
        siren: document.clientSiren ?? undefined,
        vatNumber: document.clientVatNumber ?? undefined,
        electronicAddress: document.clientElectronicAddress ?? undefined,
        electronicAddressScheme: document.clientElectronicAddressScheme ?? undefined,
      });

      setLineItems(document.services ? document.services?.map(service => ({
        id: service.id,
        description: service.description,
        taxRate: service.taxRate,
        unit: service.unit,
        quantity: service.quantity,
        unitPrice: service.unitPrice,
        itemType: service.itemType ?? 'SERVICES',
      })) : []);

      setDocumentDates({
        dueDate: document.paymentDueAt // à adapter pour les devis avec document.toValidateAt
      })
      if (document.invoicePaymentMode?.paymentMode === 'INSTALMENTS' && document.invoiceInstalmentPlan) {
        setPaymentMode('INSTALMENTS');
        setNumberOfInstalments(document.invoiceInstalmentPlan.numberOfInstalments as 2 | 3);
        setFirstDueDate(toDateInputValue(new Date(document.invoiceInstalmentPlan.startDate)));
      }
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
  const { activeCompany } = useActiveCompany();
  const isSendingBlocked = activeCompany?.hasRequiredAction === true;

  const isLineItemsEmpty = lineItems.length === 0;
  const isCreatingInvoice = mode === 'create' && documentType === 'INVOICE';
  const totalPriceInCents = Math.round(
    lineItems.reduce(
      (total, item) => total + item.unitPrice * item.quantity * (1 + item.taxRate / 100),
      0,
    ) * 100,
  );
  const isInCreationEstimate = mode === 'create'
    ? documentType === 'ESTIMATE'
    : document?.type === 'ESTIMATE';
  const isDraftEstimate = document && document?.type === "ESTIMATE" && document?.estimateStatus === "DRAFT";
  const isDraftInvoice = document && document?.type === "INVOICE" && document?.invoiceStatus === "DRAFT";
  const isInvoice = document?.type === "INVOICE";
  const isDirectDraftInvoice = Boolean(isDraftInvoice && document?.isFromEstimate === false);
  const isEditable = document?.isEditable ?? true;
  const isInvoiceContentLocked = Boolean(isInvoice && !isDirectDraftInvoice);
  // `isEditable` originated from estimate-version handling. A draft invoice is
  // editable only for its due date, independently of that estimate-only flag.
  const canEditInvoiceDueDate = Boolean(isDraftInvoice);
  const canEditDocument = isInvoice
    ? isDirectDraftInvoice || canEditInvoiceDueDate
    : isEditable;
  const issuanceDate = isInvoice || isCreatingInvoice
    ? (document?.sentAt ?? new Date().toISOString())
    : (document?.createdAt ?? new Date().toISOString());
  

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
      return null;
    }

    if(!checkDates.ok){
      setDocumentDatesErrors(checkDates.error)
      return null;
    }

    if(!checkLineItems.ok){
      setDocumentLineItemsErrors(checkLineItems.error)
      return null;
    }

    if (paymentMode === 'INSTALMENTS' && !firstDueDate) {
      showToast('Veuillez renseigner la date de première échéance.', 'error');
      return null;
    }

    const { name, email, address, city, postalCode, country, clientType, siren, vatNumber, electronicAddress, electronicAddressScheme } = client as Client;
    const clientData = { name, email, address, city, postalCode, country, clientType, siren, vatNumber, electronicAddress, electronicAddressScheme };

    let response;

    if(mode === 'create') {
      response = await createDocument({
        type: documentType,
        client: clientData,
        operationNature,
        lineItems,
        documentDates,
        instalmentsDetails: documentType === 'INVOICE' && paymentMode === 'INSTALMENTS'
          ? { numberOfInstalments, firstDueDate }
          : undefined,
      });
    } else {
      response = await updateDraftDocument(document?.id as string, {
        client: clientData,
        operationNature,
        lineItems,
        documentDates,
        instalmentsDetails: isInvoice && paymentMode === 'INSTALMENTS'
          ? { numberOfInstalments, firstDueDate }
          : undefined,
      });
    }

    if(!response.ok) {
      showToast("Impossible d’enregistrer le document. Veuillez réessayer.", "error");
      return null;
    }

    if (!response.data.document) {
      showToast("Le document a été enregistré, mais son envoi est impossible.", "error");
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

    const response = await sendDocumentToClient(
      savedDocument.id,
      undefined,
    );
    setIsSending(false);

    if (!response.ok) {
      if (isGoCardlessAccessTokenInactive(response.error)) {
        setGoCardlessReconnectCompanyId(savedDocument.companyId);
        return;
      }
      showToast("Le document est enregistré, mais l’envoi au client a échoué.", "error");
      return;
    }

    setSuccessToastType('sent');
    setIsSent(true);
    setShowSuccessToast(true);

  }

  
  
  return (
    <div className="relative bg-white p-4 rounded-md w-full max-w-6xl mx-auto overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-1 bg-primary opacity-75"></div>

      {document && <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><DocumentVersionSelector documentId={document.id} versionNumber={document.versionNumber} mode="edit" />{!isEditable && <p className="text-sm font-medium text-zinc-500">Cette version est en lecture seule.</p>}</div>}

      <fieldset disabled={!canEditDocument}>
        {(isInvoice || isCreatingInvoice) && <div className="mx-auto mb-5 flex max-w-2xl flex-col gap-1"><p className="text-sm font-semibold text-zinc-700">Nature de l’opération</p><p className="text-sm text-zinc-600">{operationNature === 'MIXED' ? 'Biens et services' : operationNature === 'GOODS' ? 'Vente de biens' : 'Prestation de services'} <span className="text-zinc-400">(calculée à partir des lignes)</span></p></div>}
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
          showPaymentMode={isCreatingInvoice || isDraftInvoice}
          canUseInstalments={canUseInstalments}
          paymentMode={paymentMode}
          numberOfInstalments={numberOfInstalments}
          firstDueDate={firstDueDate}
          minFirstDueDate={toDateInputValue(new Date(issuanceDate))}
          instalments={buildInstalmentPreview(totalPriceInCents, numberOfInstalments, firstDueDate)}
          onPaymentModeChange={setPaymentMode}
          onNumberOfInstalmentsChange={setNumberOfInstalments}
          onFirstDueDateChange={setFirstDueDate}
          lockInvoiceContent={isInvoiceContentLocked}
        />
      </fieldset>

      <DocumentPreview
        type={(document?.type ?? documentType).toLocaleLowerCase() as "estimate" | "invoice"}
        client={client}
        lineItems={lineItems}
        documentDates={documentDates}
        creationDate={issuanceDate}
      />

      <div className="w-full max-w-2xl mx-auto mt-12">
        {isSendingBlocked && (
          <p role="alert" className="mb-3 rounded-md border border-primary/20 bg-primary/5 px-3 py-2 text-sm text-primary">
            L’envoi de la facture est bloqué tant que toutes les actions requises pour l’entreprise active ne sont pas complétées. Rendez-vous dans « Mes entreprises » pour les finaliser.
          </p>
        )}
        <div className="flex flex-col-reverse items-stretch justify-between gap-3 sm:flex-row-reverse sm:items-center">
        <button
          type="button"
          disabled={isLineItemsEmpty || isSending || isSent || !canEditDocument || isSendingBlocked}
          onClick={handleConfirmAndSend}
          className="flex items-center justify-center gap-2 rounded-md bg-primary px-3 py-2 text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
         {(isInCreationEstimate || isDraftEstimate) && (isSent ? 'Devis envoyé' : isSending ? 'Envoi du devis…' : 'Confirmer et envoyer le devis')}
         {(isDraftInvoice || isCreatingInvoice) && 'Confirmer et envoyer la facture'}
         
          <Send className="h-4 w-4" aria-hidden="true" />
        </button>

        <button
          type="button"
          disabled={isSending || isSent || !canEditDocument}
          className="disabled:cursor-not-allowed disabled:opacity-45 rounded-md border border-primary bg-white px-3 py-2 font-semibold text-primary transition-colors duration-150 hover:bg-primary/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          onClick={handleSaveDraft}
        >
          Enregistrer en tant que brouillon
        </button>
        </div>
      </div>

      {showSuccessToast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-5 right-5 z-50 flex w-[calc(100%-2.5rem)] max-w-sm items-start gap-3 rounded-xl border border-emerald-400/40 bg-emerald-600 px-4 py-3.5 text-white animate-in slide-in-from-bottom-3 fade-in duration-300 sm:bottom-6 sm:right-6"
        >
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/15 ring-1 ring-white/20">
            <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
          </span>

          <div className="min-w-0 flex-1">
            <p className="font-title text-sm font-semibold">{successToastType === 'sent' ? (isInvoice ? 'Facture envoyée' : 'Devis envoyé') : 'Brouillon enregistré'}</p>
            <p className="mt-0.5 text-xs leading-relaxed text-emerald-50">
              {successToastType === 'sent' ? `${isInvoice ? 'La facture et son lien ont été envoyés au client.' : 'Le devis et son lien ont été envoyés au client.'}` : 'Le brouillon a bien été enregistré.'}
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
      {goCardlessReconnectCompanyId && (
        <GoCardlessReconnectModal
          companyId={goCardlessReconnectCompanyId}
          onClose={() => setGoCardlessReconnectCompanyId(null)}
        />
      )}
    </div>
  )
}

export default DocumentCreator
