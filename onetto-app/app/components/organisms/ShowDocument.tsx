'use client'
import { Document, DocumentNegociation } from '@/app/types'
import { convertEstimateToInvoice, createNewDocumentVersion, getDocumentNegociations, sendDocumentToClient } from '@/lib/documents/document';
import { Edit, ExternalLink, FileChartColumnIncreasing, MessageSquareText, Send, Trash } from 'lucide-react';
import DocumentDisplayComponent from '../molecules/DocumentDisplayComponent/DocumentDisplayComponent';
import Link from 'next/link';
import { useToast } from '../context/ToastContext';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface ShowDocumentProps {
  document: Document;
}

function ShowDocument({ document }: ShowDocumentProps) {

  const [negociations, setNegociations] = useState<DocumentNegociation[]>([]);
  const [isCreatingVersion, setIsCreatingVersion] = useState(false);
  const router = useRouter();

  const isEstimate = document.type === "ESTIMATE";
  
  const isDraftEstimate = document.type === "ESTIMATE" && document.estimateStatus === "DRAFT";

  const isSupersededEstimate = document.type === "ESTIMATE" && document.estimateStatus === "SUPERSEDED";

  const isAcceptedEstimate = document.type === "ESTIMATE" && document.estimateStatus === "ACCEPTED";

  const isDraftInvoice = document.type === "INVOICE" && document.invoiceStatus === "DRAFT";

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

  return (
    <div className="p-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black font-title">Détails {isEstimate ? "du devis" : "de la facture"} {document.documentNumber}</h1>
        
        {/* actions */}
        <div className="flex items-center justify-between gap-12 text-sm">
          {(isDraftEstimate || isDraftInvoice) && (
            <button
              className="px-4 py-2 text-red-500 border border-red-500 hover:bg-red-500 hover:text-white rounded-md flex items-center gap-1 cursor-pointer transition-all duration-150"
            >
              Supprimer <Trash className="w-4 h-4" />
            </button>
          )}

          <div className="modify-and-confirm flex items-center justify-between gap-4">
            {isSupersededEstimate && (
              <button
                className="px-4 py-2 text-white bg-primary border border-primary hover:bg-primary/90 rounded-md flex items-center gap-1 cursor-pointer transition-all duration-150 disabled:opacity-50"
                onClick={handleCreateNewVersion}
                disabled={isCreatingVersion}
              >
                {isCreatingVersion ? 'Création…' : 'Créer une nouvelle version'}
              </button>
            )}

            {(isDraftEstimate || isDraftInvoice) && (
              <Link
                href={`/documents/${document.id}/update-draft`} className="px-4 py-2 text-primary border border-primary hover:bg-primary hover:text-white  rounded-md flex items-center gap-1 cursor-pointer transition-all duration-150"
              >
                Modifier
                <Edit className="w-4 h-4" />
              </Link>
            )}

            {(isDraftEstimate || isDraftInvoice) && (
              <button
                className="px-4 py-2 text-white bg-primary border border-primary hover:bg-primary/90 rounded-md flex items-center gap-1 cursor-pointer transition-all duration-150"
                onClick={handleSendDocument}
              >
                Confirmer et envoyer <Send />
              </button>
            )}

            {isAcceptedEstimate && (
              <button
                onClick={handleCreateInvoiceFromEstimate}
                className="px-4 py-2 text-white bg-primary border border-primary hover:bg-primary/90 rounded-md flex items-center gap-1 cursor-pointer transition-all duration-150"
              >
                Transformer en facture <FileChartColumnIncreasing className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {negociations.length > 0 && (
        <section className="mt-5 rounded-xl border border-primary/15 bg-primary/5 p-4">
          <div className="flex items-center gap-2 text-primary">
            <MessageSquareText className="h-5 w-5" />
            <h2 className="font-title font-black">Négociation{negociations.length > 1 ? 's' : ''} du devis</h2>
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
