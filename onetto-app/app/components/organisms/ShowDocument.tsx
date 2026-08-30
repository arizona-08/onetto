'use client'
import { Document, DocumentNegociation } from '@/app/types'
import { convertEstimateToInvoice, createNewDocumentVersion, deleteDraftDocument, downloadDocumentPdf, downloadFacturX, getDocumentNegociations, retryInvoicePayment, sendB2BInvoiceToSuperPdp, sendDocumentToClient, submitB2CEreporting, syncB2BInvoiceWithSuperPdp } from '@/lib/documents/document';
import { Download, Edit, Ellipsis, ExternalLink, FileChartColumnIncreasing, MessageSquareText, RotateCcw, Send, Trash } from 'lucide-react';
import DocumentDisplayComponent from '../molecules/DocumentDisplayComponent/DocumentDisplayComponent';
import Link from 'next/link';
import { useToast } from '../context/ToastContext';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

interface ShowDocumentProps {
  document: Document;
}

function ShowDocument({ document }: ShowDocumentProps) {

  const [negociations, setNegociations] = useState<DocumentNegociation[]>([]);
  const [isCreatingVersion, setIsCreatingVersion] = useState(false);
  const [isRetryingPayment, setIsRetryingPayment] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isDownloadingFacturX, setIsDownloadingFacturX] = useState(false);
  const [isDeletingDraft, setIsDeletingDraft] = useState(false);
  const [isSubmittingEreporting, setIsSubmittingEreporting] = useState(false);
  const [isSendingB2B, setIsSendingB2B] = useState(false);
  const [isSyncingB2B, setIsSyncingB2B] = useState(false);
  const [isMoreActionsOpen, setIsMoreActionsOpen] = useState(false);
  const moreActionsRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const isEstimate = document.type === "ESTIMATE";
  
  const isDraftEstimate = document.type === "ESTIMATE" && document.estimateStatus === "DRAFT";

  const isSupersededEstimate = document.type === "ESTIMATE" && document.estimateStatus === "SUPERSEDED";

  const isAcceptedEstimate = document.type === "ESTIMATE" && document.estimateStatus === "ACCEPTED";
  const hasConvertedInvoice = Boolean(document.convertedDocuments?.length);

  const isDraftInvoice = document.type === "INVOICE" && document.invoiceStatus === "DRAFT";
  const isRejectedInvoice = document.type === "INVOICE" && document.invoiceStatus === "REJECTED";
  const canSubmitB2CEreporting = document.type === 'INVOICE' && Boolean(document.sentAt) && document.clientType === 'INDIVIDUAL';
  const canSendB2B = document.type === 'INVOICE' && Boolean(document.sentAt) && document.clientType === 'BUSINESS';
  const b2bTransmission = document.electronicInvoiceTransmissions?.[0];

  const { showToast } = useToast();

  useEffect(() => {
    async function loadNegociations() {
      const response = await getDocumentNegociations(document.id);
      if (response.ok) {
        setNegociations(response.data);
      }
    }

    void loadNegociations();
  }, [document.id]);

  useEffect(() => {
    function closeMoreActions(event: MouseEvent) {
      if (!moreActionsRef.current?.contains(event.target as Node)) {
        setIsMoreActionsOpen(false);
      }
    }

    window.addEventListener('mousedown', closeMoreActions);
    return () => window.removeEventListener('mousedown', closeMoreActions);
  }, []);

  async function handleSendDocument(){
    let response;

    if(isDraftEstimate || isDraftInvoice){
      response = await sendDocumentToClient(document.id);
    }

    if(!response?.ok){
      showToast("Erreur lors de l'envoi du document", "error");
      return;
    }

    showToast("Document envoyé avec succès", "success");
    router.refresh();
  }

  async function handleCreateNewVersion() {
    setIsCreatingVersion(true);
    const response = await createNewDocumentVersion(document.id);
    setIsCreatingVersion(false);

    if (!response.ok) {
      showToast("Impossible de créer une nouvelle version du devis.", "error");
      return;
    }

    router.push(`/documents/${response.data.document.id}/update-draft`);
  }

  async function handleCreateInvoiceFromEstimate() {
    const response = await convertEstimateToInvoice(document.id);
    if(!response.ok) {
      showToast("Impossible de créer la facture à partir du devis.", "error");
      return;
    }

    const invoice = response.data.document
    const newInvoiceId = invoice.id;

    router.push(`/documents/${newInvoiceId}/update-invoice`);
  }

  async function handleRetryInvoicePayment() {
    setIsRetryingPayment(true);
    const response = await retryInvoicePayment(document.id);
    setIsRetryingPayment(false);

    if (!response.ok) {
      showToast('Impossible de générer un nouveau lien de paiement.', 'error');
      return;
    }

    showToast('Un nouveau lien de paiement a été envoyé au client.', 'success');
    router.refresh();
  }

  async function handleDownloadPdf() {
    setIsDownloading(true);

    try {
      const pdf = await downloadDocumentPdf(document.id);
      const url = URL.createObjectURL(pdf);
      const link = window.document.createElement('a');
      link.href = url;
      link.download = `${document.type === 'INVOICE' ? 'facture' : 'devis'}-${document.documentNumber}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      showToast('Impossible de télécharger le document.', 'error');
    } finally {
      setIsDownloading(false);
    }
  }

  async function handleDownloadFacturX() {
    setIsDownloadingFacturX(true);
    try {
      const file = await downloadFacturX(document.id);
      const url = URL.createObjectURL(file);
      const link = window.document.createElement('a');
      link.href = url;
      link.download = `factur-x-${document.documentNumber}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
      showToast('Factur-X généré et validé par le convertisseur SuperPDP.', 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Impossible de générer le Factur-X.', 'error');
    } finally {
      setIsDownloadingFacturX(false);
    }
  }

  async function handleDeleteDraft() {
    setIsDeletingDraft(true);
    const response = await deleteDraftDocument(document.id);
    setIsDeletingDraft(false);

    if (!response.ok) {
      showToast('Impossible de supprimer ce brouillon.', 'error');
      return;
    }

    showToast('Brouillon supprimé avec succès.', 'success');
    router.push('/documents');
  }

  async function handleSubmitB2CEreporting() {
    setIsSubmittingEreporting(true);
    const response = await submitB2CEreporting(document.companyId, document.id);
    setIsSubmittingEreporting(false);
    if (!response.ok) {
      showToast('Impossible de transmettre la déclaration B2C à SuperPDP.', 'error');
      return;
    }
    showToast('Déclaration B2C transmise à SuperPDP.', 'success');
    router.refresh();
  }

  async function handleSendB2B() {
    setIsSendingB2B(true);
    const response = await sendB2BInvoiceToSuperPdp(document.companyId, document.id);
    setIsSendingB2B(false);
    if (!response.ok) {
      showToast('Impossible de transmettre la facture B2B. Vérifiez le point de réception sélectionné.', 'error');
      return;
    }
    showToast('Facture Factur-X transmise à SuperPDP.', 'success');
    router.refresh();
  }

  async function handleSyncB2B() {
    setIsSyncingB2B(true);
    const response = await syncB2BInvoiceWithSuperPdp(document.companyId, document.id);
    setIsSyncingB2B(false);
    if (!response.ok) {
      showToast('Impossible d’actualiser le statut SuperPDP.', 'error');
      return;
    }
    showToast(`Statut SuperPDP actualisé : ${response.data.providerStatus ?? response.data.status}.`, 'success');
    router.refresh();
  }

  return (
    <div className="p-0 sm:p-3 lg:p-5">
      <div className="flex items-center justify-between gap-4">
        <h1 className="max-w-xl text-2xl font-semibold font-title text-zinc-900">
          Détails {isEstimate ? "du devis" : "de la facture"}{' '}
          <span className="whitespace-nowrap">{document.documentNumber}</span>
        </h1>
        <div ref={moreActionsRef} className="relative shrink-0">
          <button
            type="button"
            onClick={() => setIsMoreActionsOpen((open) => !open)}
            className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-zinc-200 text-zinc-700 transition-colors hover:bg-zinc-100 focus:outline-none focus:ring-2 focus:ring-primary/30"
            aria-label="Plus d’actions"
            aria-expanded={isMoreActionsOpen}
            aria-haspopup="menu"
          >
            <Ellipsis className="h-5 w-5" aria-hidden="true" />
          </button>
          {isMoreActionsOpen && (
            <div className="absolute right-0 z-20 mt-2 w-56 rounded-xl border border-zinc-200 bg-white p-1.5 text-left shadow-lg" role="menu">
              <button type="button" onClick={() => { setIsMoreActionsOpen(false); void handleDownloadPdf(); }} disabled={isDownloading} className="flex min-h-10 w-full items-center gap-2 rounded-lg px-3 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50" role="menuitem">
                <Download className="h-4 w-4" aria-hidden="true" />
                {isDownloading ? 'Téléchargement…' : 'Télécharger le PDF'}
              </button>
              {document.type === 'INVOICE' && (
                <button type="button" onClick={() => { setIsMoreActionsOpen(false); void handleDownloadFacturX(); }} disabled={isDownloadingFacturX} className="flex min-h-10 w-full items-center gap-2 rounded-lg px-3 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50" role="menuitem">
                  <FileChartColumnIncreasing className="h-4 w-4" aria-hidden="true" />
                  {isDownloadingFacturX ? 'Génération…' : 'Télécharger le Factur-X'}
                </button>
              )}
              {(isDraftEstimate || isDraftInvoice) && (
                <button type="button" onClick={() => { setIsMoreActionsOpen(false); void handleDeleteDraft(); }} disabled={isDeletingDraft} className="flex min-h-10 w-full items-center gap-2 rounded-lg px-3 text-sm font-medium text-rose-600 transition-colors hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50" role="menuitem">
                  <Trash className="h-4 w-4" aria-hidden="true" />
                  {isDeletingDraft ? 'Suppression…' : 'Supprimer le brouillon'}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="mt-12 flex w-full justify-center text-sm">
          <div className="modify-and-confirm flex w-full flex-wrap justify-center gap-2">
            {isSupersededEstimate && (
              <button
                className="inline-flex min-h-10 items-center justify-center gap-1 rounded-md border border-primary bg-primary px-4 py-2 text-center text-white transition-all duration-150 hover:bg-primary/90 disabled:opacity-50"
                onClick={handleCreateNewVersion}
                disabled={isCreatingVersion}
              >
                {isCreatingVersion ? 'Création…' : 'Créer une nouvelle version'}
              </button>
            )}

            {isRejectedInvoice && (
              <button
                type="button"
                onClick={handleRetryInvoicePayment}
                disabled={isRetryingPayment}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-primary px-3 py-2 text-center text-primary transition-colors hover:bg-primary hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                title="Générer et envoyer un nouveau lien de paiement"
              >
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
                {isRetryingPayment ? 'Génération…' : 'Relancer le paiement'}
              </button>
            )}

            {canSubmitB2CEreporting && (
              <button
                type="button"
                onClick={handleSubmitB2CEreporting}
                disabled={isSubmittingEreporting}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-primary px-3 py-2 text-center text-primary transition-colors hover:bg-primary hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Send className="h-4 w-4" aria-hidden="true" />
                {isSubmittingEreporting ? 'Transmission…' : 'Déclarer l’e-reporting B2C'}
              </button>
            )}

            {canSendB2B && (
              <button type="button" onClick={() => void handleSendB2B()} disabled={isSendingB2B} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-primary px-3 py-2 text-center text-primary transition-colors hover:bg-primary hover:text-white disabled:cursor-not-allowed disabled:opacity-50">
                <Send className="h-4 w-4" aria-hidden="true" />
                {isSendingB2B ? 'Transmission…' : 'Transmettre à SuperPDP'}
              </button>
            )}
            {canSendB2B && (
              <button type="button" onClick={() => void handleSyncB2B()} disabled={isSyncingB2B} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-zinc-300 px-3 py-2 text-center text-zinc-700 transition-colors hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50">
                {isSyncingB2B ? 'Actualisation…' : 'Actualiser le statut SuperPDP'}
              </button>
            )}

            {(isDraftEstimate || isDraftInvoice) && (
              <button
                className="inline-flex min-h-10 items-center justify-center gap-1 rounded-md border border-primary bg-primary px-4 py-2 text-center text-white transition-all duration-150 hover:bg-primary/90"
                onClick={handleSendDocument}
              >
                Confirmer et envoyer <Send />
              </button>
            )}

            {(isDraftEstimate || isDraftInvoice) && (
              <Link
                href={isDraftInvoice
                  ? `/documents/${document.id}/update-invoice`
                  : `/documents/${document.id}/update-draft`}
                className="inline-flex min-h-10 items-center justify-center gap-1 rounded-md border border-primary px-4 py-2 text-center text-primary transition-all duration-150 hover:bg-primary hover:text-white"
              >
                Modifier
                <Edit className="w-4 h-4" />
              </Link>
            )}

            {isAcceptedEstimate && !hasConvertedInvoice && (
              <button
                onClick={handleCreateInvoiceFromEstimate}
                className="inline-flex min-h-10 items-center justify-center gap-1 rounded-md border border-primary bg-primary px-4 py-2 text-center text-white transition-all duration-150 hover:bg-primary/90"
              >
                Transformer en facture <FileChartColumnIncreasing className="w-5 h-5" />
              </button>
            )}

          </div>
          {b2bTransmission && (
            <p className="mt-3 text-center text-sm text-zinc-600">
              SuperPDP : <strong>{b2bTransmission.providerStatus ?? b2bTransmission.status}</strong>
              {b2bTransmission.providerInvoiceId ? ` · Référence ${b2bTransmission.providerInvoiceId}` : ''}
              {b2bTransmission.lastError ? ` · ${b2bTransmission.lastError}` : ''}
            </p>
          )}
        </div>

      {negociations.length > 0 && (
        <section className="mt-5 rounded-xl border border-primary/15 bg-primary/5 p-4">
          <div className="flex items-center gap-2 text-primary">
            <MessageSquareText className="h-5 w-5" />
            <h2 className="font-title font-semibold">Négociation{negociations.length > 1 ? 's' : ''} du devis</h2>
          </div>
          <div className="mt-3 space-y-3">
            {negociations.map((negociation) => (
              <div key={negociation.id} className="flex flex-col gap-2 rounded-lg bg-white p-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold">Statut : <span className="text-primary">{getNegociationStatusLabel(negociation.status)}</span></p>
                  {negociation.message && <p className="mt-1 text-zinc-600">Demande client : {negociation.message}</p>}
                </div>
                <Link href={`/negociations?token=${negociation.negociationToken}`} className="flex w-fit items-center gap-1 font-semibold text-primary hover:underline">
                  Ouvrir l’espace client <ExternalLink className="h-4 w-4" />
                </Link>
              </div>
            ))}
          </div>
        </section>
      )}

      <DocumentDisplayComponent document={document} />
    </div>
  )
}

function getNegociationStatusLabel(status: DocumentNegociation['status']) {
  return {
    PENDING: 'En attente',
    ACCEPTED: 'Accepté',
    RENEGOCIATED: 'Changements demandés',
    REJECTED: 'Refusé',
  }[status];
}

export default ShowDocument
