"use client";
import { Document, DocumentNegociation } from "@/app/types";
import {
  convertEstimateToInvoice,
  createNewDocumentVersion,
  deleteDraftDocument,
  downloadDocumentPdf,
  downloadFacturX,
  getDocumentNegociations,
  retryInvoicePayment,
  sendB2BInvoiceToSuperPdp,
  sendDocumentToClient,
  syncB2BInvoiceWithSuperPdp,
} from "@/lib/documents/document";
import {
  Download,
  Edit,
  Ellipsis,
  ExternalLink,
  FileChartColumnIncreasing,
  LoaderCircle,
  MessageSquareText,
  RotateCcw,
  Send,
  Trash,
} from "lucide-react";
import DocumentDisplayComponent from "../molecules/DocumentDisplayComponent/DocumentDisplayComponent";
import Link from "next/link";
import { useToast } from "../context/ToastContext";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import GoCardlessReconnectModal from "../molecules/GoCardlessReconnectModal";
import { isGoCardlessAccessTokenInactive } from "@/lib/gocardless/access-token";
import { useActiveCompany } from "../context/ActiveCompanyContext";
import { apiClient } from "@/lib/api";

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
  const [isSendingB2B, setIsSendingB2B] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [preparingStageId, setPreparingStageId] = useState<string | null>(null);
  const [paymentPreview, setPaymentPreview] = useState<{
    stageId: string;
    clientName: string;
    invoiceNumber: string | null;
    amountInCents: number;
    chargeDate: string;
    earlierUnpaidInCents: number;
  } | null>(null);
  const [acknowledgePrevious, setAcknowledgePrevious] = useState(false);
  const [isTriggeringStage, setIsTriggeringStage] = useState(false);
  const [isCancellingPlan, setIsCancellingPlan] = useState(false);
  const [isMoreActionsOpen, setIsMoreActionsOpen] = useState(false);
  const [isGoCardlessReconnectOpen, setIsGoCardlessReconnectOpen] =
    useState(false);
  const moreActionsRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const isEstimate = document.type === "ESTIMATE";

  const isDraftEstimate =
    document.type === "ESTIMATE" && document.estimateStatus === "DRAFT";

  const isSupersededEstimate =
    document.type === "ESTIMATE" && document.estimateStatus === "SUPERSEDED";

  const isAcceptedEstimate =
    document.type === "ESTIMATE" && document.estimateStatus === "ACCEPTED";
  const hasConvertedInvoice = Boolean(document.convertedDocuments?.length);

  const isDraftInvoice =
    document.type === "INVOICE" && document.invoiceStatus === "DRAFT";
  const isRejectedInvoice =
    document.type === "INVOICE" && document.invoiceStatus === "REJECTED";
  const b2bTransmission = document.electronicInvoiceTransmissions?.[0];
  const canSendB2B =
    document.type === "INVOICE" &&
    Boolean(document.sentAt) &&
    document.clientType === "BUSINESS" &&
    !b2bTransmission?.providerInvoiceId;

  const { showToast } = useToast();
  const { activeCompany } = useActiveCompany();
  const isSendingBlocked = activeCompany?.hasRequiredAction === true;
  const contractStages = document.contractPaymentPlan?.stages ?? [];
  const invoicedInCents = contractStages.reduce((sum, stage) =>
    sum + (stage.invoice && stage.invoice.invoiceStatus !== "DRAFT" ? stage.amountInCents : 0), 0);
  const collectedInCents = contractStages.reduce((sum, stage) =>
    sum + (stage.invoice && ["PAID", "PAID_MANUALLY"].includes(stage.invoice.invoiceStatus) ? stage.amountInCents : 0), 0);
  const euroCents = (amount: number) => (amount / 100).toLocaleString("fr-FR", { style: "currency", currency: "EUR" });

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
    if (
      !b2bTransmission?.providerInvoiceId ||
      isFinalElectronicInvoiceStatus(b2bTransmission.status)
    )
      return;

    void syncB2BInvoiceWithSuperPdp(document.companyId, document.id).then(
      (response) => {
        if (response.ok) router.refresh();
      },
    );
  }, [
    b2bTransmission?.providerInvoiceId,
    b2bTransmission?.status,
    document.companyId,
    document.id,
    router,
  ]);

  useEffect(() => {
    function closeMoreActions(event: MouseEvent) {
      if (!moreActionsRef.current?.contains(event.target as Node)) {
        setIsMoreActionsOpen(false);
      }
    }

    window.addEventListener("mousedown", closeMoreActions);
    return () => window.removeEventListener("mousedown", closeMoreActions);
  }, []);

  async function handleSendDocument() {
    setIsSending(true);
    let response;
    try {
      if (isDraftEstimate || isDraftInvoice) {
        response = await sendDocumentToClient(document.id);
      }
    } finally {
      setIsSending(false);
    }

    if (!response?.ok) {
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
    if (!response.ok) {
      showToast("Impossible de créer la facture à partir du devis.", "error");
      return;
    }

    const invoice = response.data.document;
    const newInvoiceId = invoice.id;

    router.push(`/documents/${newInvoiceId}/update-invoice`);
  }

  async function prepareStageInvoice(stageId: string) {
    setPreparingStageId(stageId);
    const response = await apiClient<{ invoiceId: string }>(`api/contracts/stages/${encodeURIComponent(stageId)}/invoice`, { method: "POST" });
    setPreparingStageId(null);
    if (!response.ok) {
      showToast(typeof response.error?.message === "string" ? response.error.message : "Impossible de préparer la facture du jalon.", "error");
      return;
    }
    router.push(`/documents/${response.data.invoiceId}`);
  }

  async function openStagePayment(stageId: string) {
    const response = await apiClient<Omit<NonNullable<typeof paymentPreview>, "stageId">>(`api/contracts/stages/${encodeURIComponent(stageId)}/payment-preview`);
    if (!response.ok) {
      showToast(typeof response.error?.message === "string" ? response.error.message : "Le prélèvement n’est pas disponible.", "error");
      return;
    }
    setAcknowledgePrevious(false);
    setPaymentPreview({ stageId, ...response.data });
  }

  async function confirmStagePayment() {
    if (!paymentPreview) return;
    setIsTriggeringStage(true);
    const response = await apiClient(`api/contracts/stages/${encodeURIComponent(paymentPreview.stageId)}/payment`, {
      method: "POST",
      body: JSON.stringify({ acknowledgeUnpaidPrevious: acknowledgePrevious }),
    });
    setIsTriggeringStage(false);
    if (!response.ok) {
      showToast(typeof response.error?.message === "string" ? response.error.message : "Le prélèvement doit être vérifié avant une nouvelle tentative.", "error");
      setPaymentPreview(null);
      router.refresh();
      return;
    }
    setPaymentPreview(null);
    showToast("Le prélèvement a été créé. GoCardless informera le client avant le débit.", "success");
    router.refresh();
  }

  async function refreshStagePayment(stageId: string) {
    const response = await apiClient(`api/contracts/stages/${encodeURIComponent(stageId)}/reconcile`, { method: "POST" });
    if (!response.ok) {
      showToast(typeof response.error?.message === "string" ? response.error.message : "Actualisation impossible.", "error");
      return;
    }
    router.refresh();
  }

  async function retryStagePayment(stageId: string) {
    if (!window.confirm("Relancer ce prélèvement GoCardless échoué ? La même facture sera conservée.")) return;
    const response = await apiClient(`api/contracts/stages/${encodeURIComponent(stageId)}/retry`, { method: "POST" });
    if (!response.ok) {
      showToast(typeof response.error?.message === "string" ? response.error.message : "La relance est indisponible.", "error");
      return;
    }
    showToast("Nouvelle tentative demandée à GoCardless.", "success");
    router.refresh();
  }

  async function markStagePaidManually(stageId: string) {
    if (!window.confirm("Confirmer la réception d’un règlement hors GoCardless pour cette facture ?")) return;
    const response = await apiClient(`api/contracts/stages/${encodeURIComponent(stageId)}/manual-settlement`, { method: "POST" });
    if (!response.ok) {
      showToast(typeof response.error?.message === "string" ? response.error.message : "Le règlement manuel n’a pas été enregistré.", "error");
      return;
    }
    showToast("Règlement manuel enregistré.", "success");
    router.refresh();
  }

  async function cancelContractPlan() {
    const plan = document.contractPaymentPlan;
    if (!plan || !window.confirm("Annuler ce projet ? Les factures déjà émises et les paiements enregistrés seront conservés.")) return;
    setIsCancellingPlan(true);
    const response = await apiClient(`api/contracts/${encodeURIComponent(plan.id)}/cancel`, { method: "POST" });
    setIsCancellingPlan(false);
    if (!response.ok) {
      showToast(typeof response.error?.message === "string" ? response.error.message : "Impossible d’annuler ce projet.", "error");
      return;
    }
    showToast("Projet annulé. Les documents déjà émis sont conservés.", "success");
    router.refresh();
  }

  async function handleRetryInvoicePayment() {
    setIsRetryingPayment(true);
    const response = await retryInvoicePayment(document.id);
    setIsRetryingPayment(false);

    if (!response.ok) {
      if (isGoCardlessAccessTokenInactive(response.error)) {
        setIsGoCardlessReconnectOpen(true);
        return;
      }
      showToast("Impossible de générer un nouveau lien de paiement.", "error");
      return;
    }

    showToast("Un nouveau lien de paiement a été envoyé au client.", "success");
    router.refresh();
  }

  async function handleDownloadPdf() {
    setIsDownloading(true);

    try {
      const pdf = await downloadDocumentPdf(document.id);
      const url = URL.createObjectURL(pdf);
      const link = window.document.createElement("a");
      link.href = url;
      link.download = `${document.type === "INVOICE" ? "facture" : "devis"}-${document.documentNumber}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      showToast("Impossible de télécharger le document.", "error");
    } finally {
      setIsDownloading(false);
    }
  }

  async function handleDownloadFacturX() {
    setIsDownloadingFacturX(true);
    try {
      const file = await downloadFacturX(document.id);
      const url = URL.createObjectURL(file);
      const link = window.document.createElement("a");
      link.href = url;
      link.download = `factur-x-${document.documentNumber}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
      showToast(
        "Factur-X généré et validé par le convertisseur SuperPDP.",
        "success",
      );
    } catch (error) {
      showToast(
        error instanceof Error
          ? error.message
          : "Impossible de générer le Factur-X.",
        "error",
      );
    } finally {
      setIsDownloadingFacturX(false);
    }
  }

  async function handleDeleteDraft() {
    setIsDeletingDraft(true);
    const response = await deleteDraftDocument(document.id);
    setIsDeletingDraft(false);

    if (!response.ok) {
      showToast("Impossible de supprimer ce brouillon.", "error");
      return;
    }

    showToast("Brouillon supprimé avec succès.", "success");
    router.push("/documents");
  }

  async function handleSendB2B() {
    setIsSendingB2B(true);
    const response = await sendB2BInvoiceToSuperPdp(
      document.companyId,
      document.id,
    );
    setIsSendingB2B(false);
    if (!response.ok) {
      showToast(
        "Impossible de transmettre la facture B2B. Vérifiez le point de réception sélectionné.",
        "error",
      );
      return;
    }
    showToast("Facture Factur-X transmise à SuperPDP.", "success");
    router.refresh();
  }

  return (
    <div className="p-0 sm:p-3 lg:p-5">
      <div className="flex items-center justify-between gap-4">
        <h1 className="max-w-xl text-2xl font-semibold font-title text-zinc-900">
          Détails {isEstimate ? "du devis" : document.contractStageInvoice?.kind === "DEPOSIT" ? "de la facture d’acompte" : document.contractStageInvoice?.kind === "BALANCE" ? "de la facture finale" : "de la facture"}{" "}
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
            <div
              className="absolute right-0 z-20 mt-2 w-56 rounded-xl border border-zinc-200 bg-white p-1.5 text-left shadow-lg"
              role="menu"
            >
              <button
                type="button"
                onClick={() => {
                  setIsMoreActionsOpen(false);
                  void handleDownloadPdf();
                }}
                disabled={isDownloading}
                className="flex min-h-10 w-full items-center gap-2 rounded-lg px-3 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
                role="menuitem"
              >
                <Download className="h-4 w-4" aria-hidden="true" />
                {isDownloading ? "Téléchargement…" : "Télécharger le PDF"}
              </button>
              {document.type === "INVOICE" && (
                <button
                  type="button"
                  onClick={() => {
                    setIsMoreActionsOpen(false);
                    void handleDownloadFacturX();
                  }}
                  disabled={isDownloadingFacturX}
                  className="flex min-h-10 w-full items-center gap-2 rounded-lg px-3 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
                  role="menuitem"
                >
                  <FileChartColumnIncreasing
                    className="h-4 w-4"
                    aria-hidden="true"
                  />
                  {isDownloadingFacturX
                    ? "Génération…"
                    : "Télécharger le Factur-X"}
                </button>
              )}
              {(isDraftEstimate || isDraftInvoice) && (
                <button
                  type="button"
                  onClick={() => {
                    setIsMoreActionsOpen(false);
                    void handleDeleteDraft();
                  }}
                  disabled={isDeletingDraft}
                  className="flex min-h-10 w-full items-center gap-2 rounded-lg px-3 text-sm font-medium text-rose-600 transition-colors hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
                  role="menuitem"
                >
                  <Trash className="h-4 w-4" aria-hidden="true" />
                  {isDeletingDraft ? "Suppression…" : "Supprimer le brouillon"}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
      {document.contractStageInvoice && document.sourceDocumentId && (
        <Link href={`/documents/${document.sourceDocumentId}`} className="mt-3 inline-block text-sm font-medium text-primary underline">
          Voir le devis et les autres jalons
        </Link>
      )}
      {isGoCardlessReconnectOpen && (
        <GoCardlessReconnectModal
          companyId={document.companyId}
          onClose={() => setIsGoCardlessReconnectOpen(false)}
        />
      )}
      <div className="mt-12 flex w-full justify-center text-sm">
        <div className="modify-and-confirm flex w-full flex-wrap justify-center gap-2">
          {isSupersededEstimate && (
            <button
              className="inline-flex min-h-10 items-center justify-center gap-1 rounded-md border border-primary bg-primary px-4 py-2 text-center text-white transition-all duration-150 hover:bg-primary/90 disabled:opacity-50"
              onClick={handleCreateNewVersion}
              disabled={isCreatingVersion}
            >
              {isCreatingVersion ? "Création…" : "Créer une nouvelle version"}
            </button>
          )}

          {isRejectedInvoice && !document.contractStageInvoice && (
            <button
              type="button"
              onClick={handleRetryInvoicePayment}
              disabled={isRetryingPayment}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-primary px-3 py-2 text-center text-primary transition-colors hover:bg-primary hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
              title="Générer et envoyer un nouveau lien de paiement"
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              {isRetryingPayment ? "Génération…" : "Relancer le paiement"}
            </button>
          )}

          {canSendB2B && (
            <button
              type="button"
              onClick={() => void handleSendB2B()}
              disabled={isSendingB2B}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-primary px-3 py-2 text-center text-primary transition-colors hover:bg-primary hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Send className="h-4 w-4" aria-hidden="true" />
              {isSendingB2B ? "Transmission…" : "Transmettre à SuperPDP"}
            </button>
          )}
          {(isDraftEstimate || isDraftInvoice) && (
            <div className="flex flex-col items-center gap-2">
              <button
                disabled={isSendingBlocked || isSending}
                className="inline-flex min-h-10 items-center justify-center gap-1 rounded-md border border-primary bg-primary px-4 py-2 text-center text-white transition-all duration-150 hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                onClick={handleSendDocument}
              >
                {isSending ? (
                  <>
                    <LoaderCircle className="h-5 w-5 animate-spin" aria-hidden="true" />
                    <span className="sr-only">Envoi en cours…</span>
                  </>
                ) : (
                  <>
                    Confirmer et envoyer <Send aria-hidden="true" />
                  </>
                )}
              </button>
              {isSendingBlocked && (
                <p
                  role="alert"
                  className="max-w-xs text-center text-xs text-red-600"
                >
                  Envoi bloqué : complétez les actions requises dans « Mes
                  entreprises ».
                </p>
              )}
            </div>
          )}

          {(isDraftEstimate || isDraftInvoice) && (
            <Link
              href={
                isDraftInvoice
                  ? `/documents/${document.id}/update-invoice`
                  : `/documents/${document.id}/update-draft`
              }
              className="inline-flex min-h-10 items-center justify-center gap-1 rounded-md border border-primary px-4 py-2 text-center text-primary transition-all duration-150 hover:bg-primary hover:text-white"
            >
              Modifier
              <Edit className="w-4 h-4" />
            </Link>
          )}

          {isAcceptedEstimate && !hasConvertedInvoice && !document.contractPaymentPlan && (
            <button
              onClick={handleCreateInvoiceFromEstimate}
              className="inline-flex min-h-10 items-center justify-center gap-1 rounded-md border border-primary bg-primary px-4 py-2 text-center text-white transition-all duration-150 hover:bg-primary/90"
            >
              Transformer en facture{" "}
              <FileChartColumnIncreasing className="w-5 h-5" />
            </button>
          )}
        </div>
        {b2bTransmission && (
          <ElectronicInvoiceStatus
            status={b2bTransmission.status}
            hint={getTransmissionHint(b2bTransmission.lastError)}
          />
        )}
      </div>

      {document.contractPaymentPlan && (
        <section className="mt-5 rounded-xl border border-primary/15 bg-white p-5" aria-label="Plan d’acomptes et de solde">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-title text-lg font-semibold">Acomptes et solde</h2>
            <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              {document.contractPaymentPlan.cancelledAt ? "Projet annulé" : `Mandat : ${document.contractPaymentPlan.mandateStatus === "ACTIVE" ? "autorisé" : document.contractPaymentPlan.mandateStatus === "PENDING" ? "en cours" : document.contractPaymentPlan.mandateStatus === "REVOKED" ? "révoqué" : "à autoriser"}`}
            </span>
          </div>
          <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <p>Total contractuel : <strong>{euroCents(document.contractPaymentPlan.totalAmountInCents)}</strong></p>
            <p>Facturé : <strong>{euroCents(invoicedInCents)}</strong></p>
            <p>Encaissé : <strong>{euroCents(collectedInCents)}</strong></p>
            <p>Reste à encaisser : <strong>{euroCents(document.contractPaymentPlan.totalAmountInCents - collectedInCents)}</strong></p>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-100" role="progressbar" aria-valuenow={collectedInCents} aria-valuemin={0} aria-valuemax={document.contractPaymentPlan.totalAmountInCents} aria-label="Progression des encaissements">
            <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, Math.max(0, collectedInCents / document.contractPaymentPlan.totalAmountInCents * 100))}%` }} />
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {document.contractPaymentPlan.stages.map((stage) => (
              <div key={stage.id} className="rounded-lg border border-zinc-200 p-3">
                <p className="font-semibold">{stage.kind === "BALANCE" ? "Solde" : `${stage.sequence}${stage.sequence === 1 ? "er" : "e"} acompte`} · {stage.percentage} %</p>
                <p className="text-lg font-semibold text-primary">{(stage.amountInCents / 100).toLocaleString("fr-FR", { style: "currency", currency: "EUR" })}</p>
                <p className="mt-1 text-sm text-zinc-600">{stage.triggerCondition}</p>
                {isAcceptedEstimate && !document.contractPaymentPlan?.cancelledAt && (stage.invoice ? (
                  <div className="mt-3 space-y-2">
                    <Link href={`/documents/${stage.invoice.id}`} className="inline-block text-sm font-semibold text-primary underline">
                      {stage.invoice.documentNumber} · {stage.invoice.invoiceStatus === "DRAFT" ? "brouillon" : stage.invoice.invoiceStatus === "PAID" || stage.invoice.invoiceStatus === "PAID_MANUALLY" ? "payée" : "à régler"}
                    </Link>
                    {stage.payment && <p className="text-xs text-zinc-600">Prélèvement : {stage.payment.status === "SUCCESS" ? "encaissé" : stage.payment.status === "FAILED" ? "échoué" : stage.payment.status === "UNCERTAIN" ? "à vérifier" : "en cours"}{stage.payment.chargeDate ? ` · prévu le ${new Date(stage.payment.chargeDate).toLocaleDateString("fr-FR")}` : ""}</p>}
                    {stage.payment?.needsAccountingReview && <p className="text-xs font-semibold text-red-700">Échec tardif ou double règlement : une vérification comptable et déclarative est nécessaire.</p>}
                    {stage.payment?.providerPaymentId && (
                      <button type="button" onClick={() => void refreshStagePayment(stage.id)} className="text-sm font-medium text-primary underline">Actualiser le prélèvement</button>
                    )}
                    {stage.payment?.status === "FAILED" && !stage.payment.automaticRetryScheduled && !stage.payment.manualRetryRequestedAt && !document.contractPaymentPlan?.cancelledAt && (
                      <button type="button" onClick={() => void retryStagePayment(stage.id)} className="block text-sm font-medium text-primary underline">Retenter le prélèvement</button>
                    )}
                    {stage.payment?.status === "FAILED" && !stage.payment.automaticRetryScheduled && !stage.payment.manualRetryRequestedAt && !stage.payment.manualSettlementAt && (
                      <button type="button" onClick={() => void markStagePaidManually(stage.id)} className="block text-sm font-medium text-primary underline">Enregistrer un règlement manuel</button>
                    )}
                    {stage.invoice.invoiceStatus === "PENDING" && !stage.payment && document.contractPaymentPlan?.mandateStatus === "ACTIVE" && (
                      <button type="button" disabled={isSendingBlocked} onClick={() => void openStagePayment(stage.id)} className="block rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">Déclencher le prélèvement</button>
                    )}
                  </div>
                ) : (
                  <button type="button" disabled={preparingStageId !== null || isSendingBlocked}
                    onClick={() => void prepareStageInvoice(stage.id)}
                    className="mt-3 rounded-lg border border-primary px-3 py-2 text-sm font-semibold text-primary disabled:opacity-50">
                    {preparingStageId === stage.id ? "Préparation…" : "Préparer la facture"}
                  </button>
                ))}
                {paymentPreview?.stageId === stage.id && (
                  <div className="mt-3 rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm">
                    <p className="font-semibold">Confirmer le prélèvement</p>
                    <p>Client : {paymentPreview.clientName}</p>
                    <p>Facture : {paymentPreview.invoiceNumber}</p>
                    <p>Montant : {(paymentPreview.amountInCents / 100).toLocaleString("fr-FR", { style: "currency", currency: "EUR" })}</p>
                    <p>Première date possible : {new Date(`${paymentPreview.chargeDate}T12:00:00`).toLocaleDateString("fr-FR")}</p>
                    <p className="mt-2 text-zinc-600">Le débit SEPA suit les délais bancaires. GoCardless informera le client avant le prélèvement.</p>
                    {paymentPreview.earlierUnpaidInCents > 0 && (
                      <label className="mt-2 flex items-start gap-2 text-amber-800">
                        <input type="checkbox" checked={acknowledgePrevious} onChange={(event) => setAcknowledgePrevious(event.target.checked)} className="mt-1" />
                        <span>Je confirme avoir pris connaissance des {(paymentPreview.earlierUnpaidInCents / 100).toLocaleString("fr-FR", { style: "currency", currency: "EUR" })} d’acomptes précédents impayés.</span>
                      </label>
                    )}
                    <div className="mt-3 flex gap-2">
                      <button type="button" disabled={isTriggeringStage || (paymentPreview.earlierUnpaidInCents > 0 && !acknowledgePrevious)} onClick={() => void confirmStagePayment()} className="rounded-lg bg-primary px-3 py-2 font-semibold text-white disabled:opacity-50">{isTriggeringStage ? "Création…" : "Confirmer le prélèvement"}</button>
                      <button type="button" onClick={() => setPaymentPreview(null)} className="rounded-lg border border-zinc-300 px-3 py-2">Annuler</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
          {isAcceptedEstimate && !document.contractPaymentPlan.cancelledAt && (
            <button type="button" disabled={isCancellingPlan} onClick={() => void cancelContractPlan()} className="mt-4 text-sm font-medium text-red-700 underline disabled:opacity-50">
              {isCancellingPlan ? "Annulation…" : "Annuler le projet"}
            </button>
          )}
        </section>
      )}

      {negociations.length > 0 && (
        <section className="mt-5 rounded-xl border border-primary/15 bg-primary/5 p-4">
          <div className="flex items-center gap-2 text-primary">
            <MessageSquareText className="h-5 w-5" />
            <h2 className="font-title font-semibold">
              Négociation{negociations.length > 1 ? "s" : ""} du devis
            </h2>
          </div>
          <div className="mt-3 space-y-3">
            {negociations.map((negociation) => (
              <div
                key={negociation.id}
                className="flex flex-col gap-2 rounded-lg bg-white p-3 text-sm sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-semibold">
                    Statut :{" "}
                    <span className="text-primary">
                      {getNegociationStatusLabel(negociation.status)}
                    </span>
                  </p>
                  {negociation.message && (
                    <p className="mt-1 text-zinc-600">
                      Demande client : {negociation.message}
                    </p>
                  )}
                </div>
                <Link
                  href={`/negociations?token=${negociation.negociationToken}`}
                  className="flex w-fit items-center gap-1 font-semibold text-primary hover:underline"
                >
                  Ouvrir l’espace client <ExternalLink className="h-4 w-4" />
                </Link>
              </div>
            ))}
          </div>
        </section>
      )}

      <DocumentDisplayComponent document={document} />
    </div>
  );
}

function isFinalElectronicInvoiceStatus(status: string) {
  return [
    "ACCEPTED",
    "COMPLETED",
    "DELIVERED",
    "INVALID",
    "REJECTED",
    "REFUSED",
    "PARTIALLY_ACCEPTED",
    "DISPUTED",
  ].includes(status);
}

function getTransmissionHint(lastError?: string | null) {
  return lastError ===
    "Sélectionnez un point de réception pour ce client avant de transmettre la facture."
    ? lastError
    : undefined;
}

function ElectronicInvoiceStatus({
  status,
  hint,
}: {
  status: string;
  hint?: string;
}) {
  const labels: Record<
    string,
    { title: string; detail: string; className: string }
  > = {
    SUBMITTING: {
      title: "Transmission en cours",
      detail: "Votre facture est en cours de préparation pour la plateforme.",
      className: "border-amber-200 bg-amber-50 text-amber-900",
    },
    SUBMITTED: {
      title: "Facture transmise",
      detail:
        "La plateforme traite votre facture. Son statut est mis à jour automatiquement.",
      className: "border-blue-200 bg-blue-50 text-blue-900",
    },
    SENT: {
      title: "Facture envoyée au destinataire",
      detail:
        "La plateforme a transmis votre facture au point de réception sélectionné.",
      className: "border-blue-200 bg-blue-50 text-blue-900",
    },
    DELIVERED: {
      title: "Facture reçue",
      detail: "La facture a été reçue par le destinataire.",
      className: "border-emerald-200 bg-emerald-50 text-emerald-900",
    },
    ACCEPTED: {
      title: "Facture acceptée",
      detail: "Le destinataire a accepté la facture.",
      className: "border-emerald-200 bg-emerald-50 text-emerald-900",
    },
    COMPLETED: {
      title: "Traitement terminé",
      detail: "La transmission électronique est terminée.",
      className: "border-emerald-200 bg-emerald-50 text-emerald-900",
    },
    INVALID: {
      title: "Facture à corriger",
      detail:
        "La plateforme ne peut pas traiter cette facture. Vérifiez les informations du client et de la facture, puis transmettez-la à nouveau.",
      className: "border-rose-200 bg-rose-50 text-rose-900",
    },
    REJECTED: {
      title: "Facture refusée",
      detail:
        "La facture a été refusée par la plateforme ou le destinataire. Vérifiez ses informations avant une nouvelle transmission.",
      className: "border-rose-200 bg-rose-50 text-rose-900",
    },
    REFUSED: {
      title: "Facture refusée",
      detail: "Le destinataire a refusé la facture.",
      className: "border-rose-200 bg-rose-50 text-rose-900",
    },
    PARTIALLY_ACCEPTED: {
      title: "Facture partiellement acceptée",
      detail: "Le destinataire a accepté une partie de la facture.",
      className: "border-amber-200 bg-amber-50 text-amber-900",
    },
    DISPUTED: {
      title: "Facture contestée",
      detail: "Le destinataire a signalé une contestation.",
      className: "border-amber-200 bg-amber-50 text-amber-900",
    },
    ON_HOLD: {
      title: "Facture en attente",
      detail: "Le traitement est temporairement en attente sur la plateforme.",
      className: "border-amber-200 bg-amber-50 text-amber-900",
    },
    FAILED: {
      title: "Transmission à reprendre",
      detail:
        hint ??
        "La transmission n’a pas pu aboutir. Vérifiez les informations de la facture avant de réessayer.",
      className: "border-rose-200 bg-rose-50 text-rose-900",
    },
  };
  const presentation = labels[status] ?? {
    title: "Traitement électronique en cours",
    detail: "Le statut sera mis à jour automatiquement.",
    className: "border-zinc-200 bg-zinc-50 text-zinc-700",
  };

  return (
    <div
      className={`mt-3 max-w-xl rounded-lg border px-4 py-3 text-left text-sm ${presentation.className}`}
    >
      <p className="font-semibold">{presentation.title}</p>
      <p className="mt-1 text-xs opacity-90">{presentation.detail}</p>
    </div>
  );
}

function getNegociationStatusLabel(status: DocumentNegociation["status"]) {
  return {
    PENDING: "En attente",
    ACCEPTED: "Accepté",
    RENEGOCIATED: "Changements demandés",
    REJECTED: "Refusé",
  }[status];
}

export default ShowDocument;
