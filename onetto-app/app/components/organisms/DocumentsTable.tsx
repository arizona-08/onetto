'use client';
import React from 'react'

import { CirclePlusIcon, FileChartColumnIncreasing, RotateCcw, Trash } from 'lucide-react';
import Link from 'next/link';
import { Document, InvoiceStatus } from '@/app/types';
import { formatDate } from '@/shared/utils';
import DocumentSelector from '../molecules/DcumentSelector';
import DocumentSorter from '../molecules/DocumentSorter';
import { convertEstimateToInvoice, massDeleteDocuments, retryInvoicePayment } from '@/lib/documents/document';
import { useToast } from '@/app/components/context/ToastContext';
import { useRouter } from 'next/navigation';

const statusMatcher: Record<string, { label: string; dotClassName: string }> = {
  DRAFT: { label: 'Brouillon', dotClassName: 'bg-zinc-400' },
  SENT: { label: 'Envoyé', dotClassName: 'bg-blue-500' },
  PENDING: { label: 'En attente', dotClassName: 'bg-amber-500' },
  PAID: { label: 'Payé', dotClassName: 'bg-emerald-500' },
  OVERDUE: { label: 'En retard', dotClassName: 'bg-orange-500' },
  REJECTED: { label: 'Refusé', dotClassName: 'bg-red-600' },
  ACCEPTED: { label: 'Accepté', dotClassName: 'bg-emerald-500' },
  SUPERSEDED: { label: 'Remplacé', dotClassName: 'bg-violet-500' },
};

function getStatusPresentation(status: string) {
  return statusMatcher[status] ?? {
    label: `${status.slice(0, 1)}${status.slice(1).toLowerCase()}`,
    dotClassName: 'bg-zinc-400',
  };
}

  export type InvoiceSelectStatus = 'Toutes' | 'En attente' | 'Payées' | 'Échues';
  export type EstimateSelectStatus = 'Tout' | 'Brouillons' | 'Envoyés' | 'Acceptés' | 'Refusés';

interface DocumentsTableProps {
  type: 'invoices' | 'estimates'
  documents: Document[]
  currentDate: string
  canCreate: boolean
}

function DocumentsTable({ type, documents, currentDate, canCreate }: DocumentsTableProps) {

  const isInvoiceType = type === 'invoices';
  const { showToast } = useToast();
  const router = useRouter();

  const [selectedStatus, setSelectedStatus] = React.useState<InvoiceSelectStatus | EstimateSelectStatus>(isInvoiceType ? 'Toutes' : 'Tout');
  const [sortMethod, setSortMethod] = React.useState<'date' | 'amount'>('date')
  const [isSortOpen, setIsSortOpen] = React.useState<boolean>(false);
  const [checkedDocuments, setCheckedDocuments] = React.useState<string[]>([]);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [retryingDocumentIds, setRetryingDocumentIds] = React.useState<string[]>([]);
  const [convertingDocumentIds, setConvertingDocumentIds] = React.useState<string[]>([]);
  

  const [masterDocumentsList, setMasterDocumentsList] = React.useState<Document[]>(documents.map((document) => ({
    ...document, isChecked: false
  })));

  const hasCheckedDocuments = checkedDocuments.length > 0;
  const allChecked = checkedDocuments.length === masterDocumentsList.length && masterDocumentsList.length > 0;
  const documentsToDelete = masterDocumentsList.filter((document) => checkedDocuments.includes(document.id));

  function handleCheckedDocumentByID(documentId: string) {
    setCheckedDocuments((prevCheckedDocuments) => {
      if (prevCheckedDocuments.includes(documentId)) {
        return prevCheckedDocuments.filter((id) => id !== documentId);
      } else {
        return [...prevCheckedDocuments, documentId];
      }
    });
  }

  function isChecked(documentId: string){
    return checkedDocuments.includes(documentId);
  }

  function toggleCheckAll(){
    if(allChecked){
      setCheckedDocuments([]);
    } else {
      setCheckedDocuments(masterDocumentsList.map((document) => document.id));
    }
  }

  async function handleDeleteCheckedDocuments(checked: string[]) {
    setIsDeleting(true);
    const response = await massDeleteDocuments(checked);
    setIsDeleting(false);

    if(!response.ok) {
      console.error("Erreur lors de la suppression des documents :", response.error);
      const message = typeof response.error.message === 'string'
        ? response.error.message
        : 'Impossible de supprimer les documents sélectionnés.';
      showToast(message, 'error');
      return;
    }

    setCheckedDocuments([]);
    setMasterDocumentsList((prevDocuments) => prevDocuments.filter((document) => !checked.includes(document.id)));
    setIsDeleteModalOpen(false);

    showToast(response.data.message, 'success');
  }

  function createPaymentNote(paymentDueAt: string, invoiceStatus: InvoiceStatus): string | undefined{
    const dueDate = new Date(paymentDueAt);
    const renderedDate = new Date(currentDate);

    if (renderedDate > dueDate && invoiceStatus !== "PAID") {
      const daysOverdue = Math.floor((renderedDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
      return `En retard de ${daysOverdue} jours`;
    }
    return
  }

  async function handleRetryInvoicePayment(documentId: string) {
    setRetryingDocumentIds((ids) => [...ids, documentId]);
    const response = await retryInvoicePayment(documentId);
    setRetryingDocumentIds((ids) => ids.filter((id) => id !== documentId));

    if (!response.ok) {
      showToast('Impossible de générer un nouveau lien de paiement.', 'error');
      return;
    }

    setMasterDocumentsList((documents) => documents.map((document) => (
      document.id === documentId
        ? { ...document, invoiceStatus: 'SENT' }
        : document
    )));
    showToast('Un nouveau lien de paiement a été envoyé au client.', 'success');
  }

  async function handleConvertEstimateToInvoice(documentId: string) {
    setConvertingDocumentIds((ids) => [...ids, documentId]);
    const response = await convertEstimateToInvoice(documentId);
    setConvertingDocumentIds((ids) => ids.filter((id) => id !== documentId));

    if (!response.ok) {
      showToast('Impossible de transformer ce devis en facture.', 'error');
      return;
    }

    router.push(`/documents/${response.data.document.id}/update-invoice`);
  }

  function canConvertEstimate(document: Document): boolean {
    return !isInvoiceType
      && document.estimateStatus === 'ACCEPTED'
      && !document.convertedDocuments?.length;
  }


  return (
    <div className="mt-3">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          {!isInvoiceType && canCreate && (
            <Link href="/documents/create" className="shadow-md flex items-center justify-center gap-3 p-4 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors cursor-pointer">
              <CirclePlusIcon />
              <span className="text-sm font-medium">{isInvoiceType ? 'Créer une facture' : 'Créer un devis'}</span>
            </Link>
          )}
        </div>
        <div className="flex flex-col-reverse items-end justify-start sm:flex-row sm:items-center sm:justify-between flex-wrap gap-5">
          <div>
            { hasCheckedDocuments && (
              <button
                className="flex items-center gap-3 bg-red-500 text-white px-3 py-2 rounded-md text-sm"
                onClick={() => setIsDeleteModalOpen(true)}
              >
                <span className="block md:hidden xl:block">Supprimer les documents</span> <Trash className="w-4 h-4" />
              </button>
              )}
          </div>

          <div className="flex items-center justify-start flex-wrap gap-5">
            <DocumentSelector type={isInvoiceType ? "invoices" : "estimates"} selectedStatus={selectedStatus} onSelectStatus={setSelectedStatus} />
            <DocumentSorter type={isInvoiceType ? "invoices" : "estimates"} sortMethod={sortMethod} setSortMethod={setSortMethod} isOpen={isSortOpen} setIsOpen={setIsSortOpen} />
          </div>
        </div>
      </div>

      {/* list de factures pour mobile */}
      <div className="md:hidden">
        <ul className="mt-4 space-y-3">
          {
            masterDocumentsList.map((document) => (
              <li key={document.id}>
                <div className="bg-white px-3 py-5 rounded-md flex items-start justify-between">
                  {/* left part */}
                  <div className="space-y-1">
                    <p className="text-sm font-semibold">{document.clientName}</p>
                    <div className="text-gray-600 text-xs flex items-center gap-1">
                      <Link href={`/documents/${document.id}`} className="underline hover:text-primary">{document.documentNumber}</Link>
                      <span className="inline-block w-1 h-1 rounded-full bg-zinc-600"></span>
                      <span>{formatDate(document.paymentDueAt)}</span>
                    </div>
                  </div>

                  {/* right part */}
                  <div className="flex flex-col items-end gap-1">
                    <p className="text-sm font-semibold">{document.totalPrice.toLocaleString("fr-FR", { style: "currency", currency: "EUR" })}</p>
                    <span className="inline-flex items-center gap-2 text-xs font-semibold text-zinc-700">
                      <span className={`h-2 w-2 rounded-full ${getStatusPresentation(isInvoiceType ? document.invoiceStatus : document.estimateStatus).dotClassName}`} />
                      {getStatusPresentation(isInvoiceType ? document.invoiceStatus : document.estimateStatus).label}
                    </span>
                    {isInvoiceType && document.invoiceStatus === 'REJECTED' && (
                      <button
                        type="button"
                        onClick={() => void handleRetryInvoicePayment(document.id)}
                        disabled={retryingDocumentIds.includes(document.id)}
                        className="mt-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-red-600 text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                        title="Générer et envoyer un nouveau lien de paiement"
                        aria-label="Relancer le paiement"
                      >
                        <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    )}
                    {canConvertEstimate(document) && (
                      <button
                        type="button"
                        onClick={() => void handleConvertEstimateToInvoice(document.id)}
                        disabled={convertingDocumentIds.includes(document.id)}
                        className="mt-2 inline-flex h-7 w-7 items-center justify-center rounded-md bg-primary text-white hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                        title="Transformer en facture"
                        aria-label="Transformer en facture"
                      >
                        <FileChartColumnIncreasing className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    )}
                  </div>
                </div>
              </li>
            ))
          }
        </ul>
      </div>

      {/* Tableau de facture pour tablet et desktop */}
      <div className="hidden md:block mt-3 overflow-x-auto rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <table className="min-w-185 w-full border-collapse text-left">
          <thead className="bg-zinc-50 text-xs font-semibold uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="w-12 px-5 py-4">
                <input
                type="checkbox"
                className="h-4 w-4 rounded border-zinc-300"
                checked={allChecked}
                onChange={() => toggleCheckAll()}
              />
              </th>
              <th className="px-5 py-4">{isInvoiceType ? 'Facture' : 'Devis'}</th>
              <th className="px-5 py-4">Client</th>
              <th className="px-5 py-4">Date d&apos;émission</th>
              <th className="px-5 py-4">Date d&apos;échéance</th>
              <th className="px-5 py-4">Montant</th>
              <th className="px-5 py-4">Statut</th>
            </tr>
          </thead>
          <tbody className="text-sm text-zinc-700">
            { masterDocumentsList.length === 0 && (
              <tr className="border-t border-zinc-100">
                <td colSpan={7} className="px-5 py-5 text-center text-zinc-500">
                  {isInvoiceType ? 'Aucune facture trouvée' : 'Aucun devis trouvé'}
                </td>
              </tr>
            )}


            {masterDocumentsList.length > 0 && masterDocumentsList.map((document) => (
              <tr key={document.id} className="border-t border-zinc-100">
                <td className="px-5 py-5 align-top">
                  <input
                    type="checkbox"
                    checked={isChecked(document.id)}
                    onChange={() => handleCheckedDocumentByID(document.id)}
                    className="h-4 w-4 rounded border-zinc-300"
                  />
                </td>
                <td className="px-5 py-5 align-top">
                  <Link href={`/documents/${document.id}`} className="underline text-zinc-900 hover:text-primary">
                    <p className="font-semibold ">{document.documentNumber}</p>
                  </Link>
                  <p className="text-xs text-zinc-500">Type {isInvoiceType ? "de la facture" : "du devis"}</p>
                </td>
                <td className="px-5 py-5 align-top">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700">
                      {document.clientName.split(' ').map((n) => n[0]).join('')}
                    </div>
                    <div className="font-medium text-zinc-900">{document.clientName}</div>
                  </div>
                </td>
                <td className="px-5 py-5 align-top">
                  <div className="font-medium text-zinc-900">{formatDate(document.createdAt)}</div>
                </td>
                <td className="px-5 py-5 align-top">
                  <div className="font-medium text-zinc-900">{formatDate(document.paymentDueAt)}</div>
                  {
                    createPaymentNote(document.paymentDueAt, document.invoiceStatus) && (
                      <div className="text-xs text-rose-600">
                        {createPaymentNote(document.paymentDueAt, document.invoiceStatus)}
                      </div>
                    )
                  }
                </td>
                <td className="px-5 py-5 align-top font-semibold text-zinc-900">
                  {document.totalPrice.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                </td>
                <td className="px-5 py-5 align-top">
                  <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-2 text-xs font-semibold text-zinc-700">
                    <span className={`h-2 w-2 rounded-full ${getStatusPresentation(isInvoiceType ? document.invoiceStatus : document.estimateStatus).dotClassName}`} />
                    {getStatusPresentation(isInvoiceType ? document.invoiceStatus : document.estimateStatus).label}
                  </span>
                  {isInvoiceType && document.invoiceStatus === 'REJECTED' && (
                    <button
                      type="button"
                      onClick={() => void handleRetryInvoicePayment(document.id)}
                      disabled={retryingDocumentIds.includes(document.id)}
                      className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-red-600 text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                      title="Générer et envoyer un nouveau lien de paiement"
                      aria-label="Relancer le paiement"
                    >
                      <RotateCcw className="h-4 w-4" aria-hidden="true" />
                    </button>
                  )}
                  {canConvertEstimate(document) && (
                    <button
                      type="button"
                      onClick={() => void handleConvertEstimateToInvoice(document.id)}
                      disabled={convertingDocumentIds.includes(document.id)}
                      className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-primary text-white transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                      title="Transformer en facture"
                      aria-label="Transformer en facture"
                    >
                      <FileChartColumnIncreasing className="h-4 w-4" aria-hidden="true" />
                    </button>
                  )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/40 p-4" role="dialog" aria-modal="true" aria-labelledby="delete-documents-title">
          <div className="flex max-h-[calc(100vh-2rem)] w-full max-w-md flex-col rounded-lg bg-white p-6 shadow-xl">
            <h2 id="delete-documents-title" className="font-title text-xl font-black text-zinc-900">Supprimer les documents sélectionnés ?</h2>
            <p className="mt-3 text-sm text-zinc-600">Cette action est irréversible. Les documents suivants seront supprimés :</p>
            <ul className="mt-3 min-h-0 flex-1 list-disc space-y-1 overflow-y-auto pl-5 text-sm font-semibold text-zinc-800">
              {documentsToDelete.map((document) => (
                <li key={document.id}>{document.documentNumber}</li>
              ))}
            </ul>
            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button type="button" disabled={isDeleting} onClick={() => setIsDeleteModalOpen(false)} className="rounded-md border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700 disabled:cursor-not-allowed disabled:opacity-60">Annuler</button>
              <button type="button" disabled={isDeleting} onClick={() => void handleDeleteCheckedDocuments(checkedDocuments)} className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60">{isDeleting ? 'Suppression…' : 'Supprimer définitivement'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default DocumentsTable
