"use client";
import React from "react";

import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CirclePlusIcon,
  FileChartColumnIncreasing,
  Search,
  RotateCcw,
  Send,
  Trash,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";
import { Document, InvoiceStatus } from "@/app/types";
import { formatDate } from "@/shared/utils";
import DocumentSelector from "../molecules/DcumentSelector";
import DocumentSorter from "../molecules/DocumentSorter";
import InvoicePaymentDetails, {
  PaymentGauge,
} from "./InvoicePaymentDetails";
import { getInvoicePaymentSummary } from "./invoice-payment-summary";
import InvoiceActionsMenu, {
  type InvoiceMenuAction,
} from "../molecules/InvoiceActionsMenu";
import {
  convertEstimateToInvoice,
  deleteDraftDocument,
  getMyDocuments,
  getDocumentsPage,
  markInvoiceAsPaidManually,
  markInvoiceAsPendingManually,
  massDeleteDocuments,
  reconcileInstalmentPayments,
  reconcileOneTimePayment,
  retryInvoicePayment,
  resendInstalmentMandateAuthorisation,
  sendDocumentToClient,
} from "@/lib/documents/document";
import { useToast } from "@/app/components/context/ToastContext";
import { useRouter } from "next/navigation";
import GoCardlessReconnectModal from "../molecules/GoCardlessReconnectModal";
import { isGoCardlessAccessTokenInactive } from "@/lib/gocardless/access-token";
import { apiClient } from "@/lib/api";
import { Input } from "../ui/Field";

const statusMatcher: Record<string, { label: string; dotClassName: string }> = {
  DRAFT: { label: "Brouillon", dotClassName: "bg-zinc-400" },
  SENT: { label: "Envoyé", dotClassName: "bg-blue-500" },
  PENDING: { label: "En attente", dotClassName: "bg-amber-500" },
  PAYMENT_IN_PROGRESS: {
    label: "Paiement en cours",
    dotClassName: "bg-blue-500",
  },
  PAID: { label: "Payé", dotClassName: "bg-emerald-500" },
  PARTIALLY_PAID: {
    label: "Payée partiellement",
    dotClassName: "bg-zinc-400",
  },
  PAID_MANUALLY: {
    label: "Payée manuellement",
    dotClassName: "bg-emerald-500",
  },
  OVERDUE: { label: "En retard", dotClassName: "bg-orange-500" },
  REJECTED: { label: "Refusé", dotClassName: "bg-red-600" },
  ACCEPTED: { label: "Accepté", dotClassName: "bg-emerald-500" },
  SUPERSEDED: { label: "Remplacé", dotClassName: "bg-violet-500" },
};

function getStatusPresentation(status: string) {
  return (
    statusMatcher[status] ?? {
      label: `${status.slice(0, 1)}${status.slice(1).toLowerCase()}`,
      dotClassName: "bg-zinc-400",
    }
  );
}

function getDocumentIssueLabel(document: Document) {
  const issuedAt = document.sentAt ?? document.createdAt;
  const verb = document.type === "INVOICE" ? "Émise" : "Émis";
  return `${verb} le ${new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(issuedAt))}`;
}

function getContractInvoiceLabel(document: Document) {
  const stage = document.contractStageInvoice;
  if (!stage) return null;
  if (stage.kind === "BALANCE") return "Facture finale";
  const depositCount = stage.plan?.stages.filter((item) => item.kind === "DEPOSIT").length;
  return depositCount ? `Acompte ${stage.sequence}/${depositCount}` : `Acompte ${stage.sequence}`;
}

const invoiceStatusFilterMatcher: Partial<Record<InvoiceSelectStatus, string>> =
  {
    "En attente": "PENDING",
    "Paiement en cours": "PAYMENT_IN_PROGRESS",
    Payées: "PAID",
    Échues: "OVERDUE",
    Refusées: "REJECTED",
    Brouillons: "DRAFT",
  };

const estimateStatusFilterMatcher: Partial<
  Record<EstimateSelectStatus, string>
> = {
  Brouillons: "DRAFT",
  Envoyés: "SENT",
  Acceptés: "ACCEPTED",
  Refusés: "REJECTED",
};

export type InvoiceSelectStatus =
  | "Toutes"
  | "Brouillons"
  | "En attente"
  | "Paiement en cours"
  | "Payées"
  | "Échues"
  | "Refusées";

export type EstimateSelectStatus =
  "Tous" | "Brouillons" | "Envoyés" | "Acceptés" | "Refusés";

interface DocumentsTableProps {
  type: "invoices" | "estimates";
  documents: Document[];
  currentDate: string;
  initialPagination?: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

function DocumentsTable({
  type,
  documents,
  currentDate,
  initialPagination,
}: DocumentsTableProps) {
  const isInvoiceType = type === "invoices";
  const pageSize = initialPagination?.pageSize ?? 5;
  const { showToast } = useToast();
  const router = useRouter();

  const [selectedStatus, setSelectedStatus] = React.useState<
    InvoiceSelectStatus | EstimateSelectStatus
  >(isInvoiceType ? "Toutes" : "Tous");
  const [sortMethod, setSortMethod] = React.useState<"date" | "amount">("date");
  const [isSortOpen, setIsSortOpen] = React.useState<boolean>(false);
  const [checkedDocuments, setCheckedDocuments] = React.useState<string[]>([]);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [draftToDelete, setDraftToDelete] = React.useState<Document | null>(null);
  const [sendingDocumentIds, setSendingDocumentIds] = React.useState<string[]>([]);
  const [reconcilingDocumentIds, setReconcilingDocumentIds] = React.useState<string[]>([]);
  const [retryingDocumentIds, setRetryingDocumentIds] = React.useState<
    string[]
  >([]);
  const [resendingMandateDocumentIds, setResendingMandateDocumentIds] =
    React.useState<string[]>([]);
  const [updatingManualPaymentIds, setUpdatingManualPaymentIds] =
    React.useState<string[]>([]);
  const [manualPaymentDocument, setManualPaymentDocument] =
    React.useState<Document | null>(null);
  const [goCardlessReconnectCompanyId, setGoCardlessReconnectCompanyId] =
    React.useState<string | null>(null);
  const [convertingDocumentIds, setConvertingDocumentIds] = React.useState<
    string[]
  >([]);
  const [currentPage, setCurrentPage] = React.useState(
    initialPagination?.page ?? 1,
  );
  const [totalPages, setTotalPages] = React.useState(
    initialPagination?.totalPages ?? 1,
  );
  const [totalDocuments, setTotalDocuments] = React.useState(
    initialPagination?.total ?? documents.length,
  );
  const [isLoadingPage, setIsLoadingPage] = React.useState(false);
  const [searchInput, setSearchInput] = React.useState("");
  const [searchTerm, setSearchTerm] = React.useState("");
  const [searchPage, setSearchPage] = React.useState(1);
  const [allDocuments, setAllDocuments] = React.useState<Document[] | null>(null);
  const [isLoadingSearch, setIsLoadingSearch] = React.useState(false);
  const [searchFailed, setSearchFailed] = React.useState(false);
  const [searchRetry, setSearchRetry] = React.useState(0);
  const [selectedInvoiceId, setSelectedInvoiceId] = React.useState<string | null>(null);
  const isClientMode = Boolean(searchTerm) || sortMethod === "amount";

  const [masterDocumentsList, setMasterDocumentsList] = React.useState<
    Document[]
  >(
    documents.map((document) => ({
      ...document,
      isChecked: false,
    })),
  );

  React.useEffect(() => {
    const timer = window.setTimeout(() => setSearchTerm(searchInput.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  React.useEffect(() => {
    if (!isClientMode || allDocuments) return;
    const controller = new AbortController();
    let cancelled = false;
    queueMicrotask(async () => {
      if (cancelled) return;
      setIsLoadingSearch(true);
      setSearchFailed(false);
      const response = await getMyDocuments(false, controller.signal);
      if (cancelled) return;
      setIsLoadingSearch(false);
      if (!response.ok) {
        setSearchFailed(true);
        return;
      }
      setSearchFailed(false);
      setAllDocuments(
        isInvoiceType
          ? response.data.invoices
          : response.data.estimates.filter((document) => document.isLastVersion),
      );
    });
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [isClientMode, allDocuments, isInvoiceType, searchRetry]);

  const searchResults = React.useMemo(() => {
    if (!isClientMode || !allDocuments) return [];
    const normalize = (value: string) =>
      value
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, " ")
        .toLowerCase();
    const query = normalize(searchTerm);
    const technicalStatus = isInvoiceType
      ? invoiceStatusFilterMatcher[selectedStatus as InvoiceSelectStatus]
      : estimateStatusFilterMatcher[selectedStatus as EstimateSelectStatus];
    return allDocuments.filter((document) => {
      const matchesStatus = !technicalStatus ||
        (isInvoiceType
          ? technicalStatus === "PAID"
            ? ["PAID", "PAID_MANUALLY"].includes(document.invoiceStatus)
            : document.invoiceStatus === technicalStatus
          : document.estimateStatus === technicalStatus);
      if (!matchesStatus) return false;
      const amount = document.totalPrice.toLocaleString("fr-FR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
      return !query || normalize(`${document.documentNumber} ${document.clientName} ${amount} € ${document.totalPrice}`).includes(query);
    });
  }, [searchTerm, allDocuments, isInvoiceType, selectedStatus, isClientMode]);

  const sortedDocuments = React.useMemo(() => {
    const source = isClientMode ? searchResults : masterDocumentsList;
    return sortMethod === "amount"
      ? [...source].sort((first, second) => second.totalPrice - first.totalPrice)
      : source;
  }, [isClientMode, searchResults, masterDocumentsList, sortMethod]);
  const visibleTotalPages = isClientMode
    ? Math.max(1, Math.ceil(sortedDocuments.length / pageSize))
    : totalPages;
  const visibleCurrentPage = isClientMode ? searchPage : currentPage;
  const visibleDocuments = isClientMode
    ? sortedDocuments.slice((searchPage - 1) * pageSize, searchPage * pageSize)
    : sortedDocuments;
  const selectedInvoice = isInvoiceType
    ? visibleDocuments.find((document) => document.id === selectedInvoiceId)
    : undefined;
  const isLoadingResults = isLoadingPage ||
    (isClientMode && (isLoadingSearch || (!allDocuments && !searchFailed)));

  const hasCheckedDocuments = checkedDocuments.length > 0;
  const allChecked =
    checkedDocuments.length === visibleDocuments.length &&
    visibleDocuments.length > 0;
  const documentsToDelete = draftToDelete
    ? [draftToDelete]
    : visibleDocuments.filter((document) =>
        checkedDocuments.includes(document.id),
      );

  function handleCheckedDocumentByID(documentId: string) {
    setCheckedDocuments((prevCheckedDocuments) => {
      if (prevCheckedDocuments.includes(documentId)) {
        return prevCheckedDocuments.filter((id) => id !== documentId);
      } else {
        return [...prevCheckedDocuments, documentId];
      }
    });
  }

  function isChecked(documentId: string) {
    return checkedDocuments.includes(documentId);
  }

  function toggleCheckAll() {
    if (allChecked) {
      setCheckedDocuments([]);
    } else {
      setCheckedDocuments(visibleDocuments.map((document) => document.id));
    }
  }

  function toggleInvoiceDetails(documentId: string) {
    setSelectedInvoiceId((current) => current === documentId ? null : documentId);
  }

  function handleInvoiceRowClick(
    event: React.MouseEvent<HTMLTableRowElement>,
    documentId: string,
  ) {
    if ((event.target as HTMLElement).closest("a, button, input, select, textarea")) return;
    toggleInvoiceDetails(documentId);
  }

  async function handleDeleteCheckedDocuments(checked: string[]) {
    setIsDeleting(true);
    try {
      const response = draftToDelete
        ? await deleteDraftDocument(draftToDelete.id)
        : await massDeleteDocuments(checked);

      if (!response.ok) {
        const message =
          typeof response.error.message === "string"
            ? response.error.message
            : "Impossible de supprimer les documents sélectionnés.";
        showToast(message, "error");
        return;
      }

      setIsDeleteModalOpen(false);
      setDraftToDelete(null);

      const nextTotal = Math.max(0, totalDocuments - checked.length);
      const nextTotalPages = Math.max(1, Math.ceil(nextTotal / pageSize));
      const nextPage = Math.min(currentPage, nextTotalPages);

      setCheckedDocuments([]);
      setTotalDocuments(nextTotal);
      setTotalPages(nextTotalPages);
      await loadDocumentsPage(nextPage);

      showToast(response.data.message, "success");
    } catch {
      showToast("Impossible de supprimer le document.", "error");
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleSendDraftInvoice(document: Document) {
    if (sendingDocumentIds.includes(document.id)) return;
    setSendingDocumentIds((ids) => [...ids, document.id]);
    try {
      const response = await sendDocumentToClient(document.id);
      if (!response.ok) {
        showToast("Impossible d'envoyer cette facture.", "error");
        return;
      }
      await loadDocumentsPage(currentPage);
      router.refresh();
      showToast("Facture validée et envoyée au client.", "success");
    } catch {
      showToast("Impossible d'envoyer cette facture.", "error");
    } finally {
      setSendingDocumentIds((ids) => ids.filter((id) => id !== document.id));
    }
  }

  async function handleReconcileInvoice(document: Document) {
    if (reconcilingDocumentIds.includes(document.id)) return;
    setReconcilingDocumentIds((ids) => [...ids, document.id]);
    try {
      const response =
        document.invoicePaymentMode?.paymentMode === "INSTALMENTS"
          ? await reconcileInstalmentPayments(document.id)
          : await reconcileOneTimePayment(document.id);
      if (!response.ok) {
        showToast(
          typeof response.error.message === "string"
            ? response.error.message
            : "Impossible d'actualiser les paiements.",
          "error",
        );
        return;
      }
      await loadDocumentsPage(currentPage);
      router.refresh();
      showToast(
        "requiresPaymentReview" in response.data &&
          response.data.requiresPaymentReview
          ? "Paiements actualisés. Une échéance nécessite une vérification."
          : response.data.message,
        "success",
      );
    } catch {
      showToast("Impossible d'actualiser les paiements.", "error");
    } finally {
      setReconcilingDocumentIds((ids) =>
        ids.filter((id) => id !== document.id),
      );
    }
  }

  async function handleReconcileContractStage(document: Document) {
    const stageId = document.contractStageInvoice?.id;
    if (!stageId || reconcilingDocumentIds.includes(document.id)) return;
    if (!document.contractStageInvoice?.payment?.providerPaymentId) {
      showToast("Aucun prélèvement GoCardless n’a encore été créé pour cet acompte.", "error");
      return;
    }
    setReconcilingDocumentIds((ids) => [...ids, document.id]);
    try {
      const response = await apiClient(
        `api/contracts/stages/${encodeURIComponent(stageId)}/reconcile`,
        { method: "POST" },
      );
      if (!response.ok) {
        if (isGoCardlessAccessTokenInactive(response.error)) {
          setGoCardlessReconnectCompanyId(document.companyId);
          return;
        }
        showToast(
          typeof response.error.message === "string"
            ? response.error.message
            : "Impossible d’actualiser le paiement.",
          "error",
        );
        return;
      }
      await loadDocumentsPage(currentPage);
      router.refresh();
      showToast("Paiement actualisé.", "success");
    } catch {
      showToast("Impossible d’actualiser le paiement.", "error");
    } finally {
      setReconcilingDocumentIds((ids) => ids.filter((id) => id !== document.id));
    }
  }

  function openManualPaymentModal(document: Document) {
    setManualPaymentDocument(document);
  }

  function closeManualPaymentModal() {
    setManualPaymentDocument(null);
  }

  async function confirmManualPayment() {
    if (!manualPaymentDocument) {
      return;
    }

    const hasBeenMarkedAsPaid = await handleManualPaymentStatus(
      manualPaymentDocument,
    );

    if (hasBeenMarkedAsPaid) {
      closeManualPaymentModal();
    }
  }

  function createPaymentNote(
    paymentDueAt: string,
    invoiceStatus: InvoiceStatus,
  ): string | undefined {
    const dueDate = new Date(paymentDueAt);
    const renderedDate = new Date(currentDate);

    if (
      renderedDate > dueDate &&
      invoiceStatus !== "PAID" &&
      invoiceStatus !== "PAID_MANUALLY"
    ) {
      const daysOverdue = Math.floor(
        (renderedDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24),
      );
      return `En retard de ${daysOverdue} jours`;
    }
    return;
  }

  async function handleRetryInvoicePayment(documentId: string) {
    setRetryingDocumentIds((ids) => [...ids, documentId]);
    try {
      const response = await retryInvoicePayment(documentId);
      if (!response.ok) {
        if (isGoCardlessAccessTokenInactive(response.error)) {
          const document = visibleDocuments.find(
            (item) => item.id === documentId,
          );
          if (document) setGoCardlessReconnectCompanyId(document.companyId);
          return;
        }
        showToast("Impossible de générer un nouveau lien de paiement.", "error");
        return;
      }

      setMasterDocumentsList((documents) =>
        documents.map((document) =>
          document.id === documentId
            ? { ...document, invoiceStatus: "PENDING" }
            : document,
        ),
      );
      setAllDocuments((documents) =>
        documents?.map((document) =>
          document.id === documentId
            ? { ...document, invoiceStatus: "PENDING" }
            : document,
        ) ?? null,
      );
      setSearchPage(1);
      showToast("Un nouveau lien de paiement a été envoyé au client.", "success");
    } catch {
      showToast("Impossible de générer un nouveau lien de paiement.", "error");
    } finally {
      setRetryingDocumentIds((ids) => ids.filter((id) => id !== documentId));
    }
  }

  async function handleManualPaymentStatus(
    document: Document,
  ): Promise<boolean> {
    const isPending = document.invoiceStatus === "PENDING";
    const nextStatus: InvoiceStatus = isPending ? "PAID_MANUALLY" : "PENDING";

    setUpdatingManualPaymentIds((ids) => [...ids, document.id]);
    const errorMessage = isPending
      ? "Impossible de marquer cette facture comme payée manuellement."
      : "Impossible de remettre cette facture en attente.";
    try {
      const response = isPending
        ? await markInvoiceAsPaidManually(document.id)
        : await markInvoiceAsPendingManually(document.id);
      if (!response.ok) {
        showToast(errorMessage, "error");
        return false;
      }

      setMasterDocumentsList((documents) =>
        documents.map((item) =>
          item.id === document.id ? { ...item, invoiceStatus: nextStatus } : item,
        ),
      );
      setAllDocuments((documents) =>
        documents?.map((item) =>
          item.id === document.id ? { ...item, invoiceStatus: nextStatus } : item,
        ) ?? null,
      );
      setSearchPage(1);
      showToast(response.data.message, "success");
      return true;
    } catch {
      showToast(errorMessage, "error");
      return false;
    } finally {
      setUpdatingManualPaymentIds((ids) =>
        ids.filter((id) => id !== document.id),
      );
    }
  }

  async function handleResendMandateAuthorisation(documentId: string) {
    setResendingMandateDocumentIds((ids) => [...ids, documentId]);
    try {
      const response = await resendInstalmentMandateAuthorisation(documentId);
      if (!response.ok) {
        showToast(
          typeof response.error.message === "string"
            ? response.error.message
            : "Impossible d'envoyer une nouvelle autorisation de prélèvement.",
          "error",
        );
        return;
      }
      showToast(response.data.message, "success");
    } catch {
      showToast("Impossible d'envoyer une nouvelle autorisation de prélèvement.", "error");
    } finally {
      setResendingMandateDocumentIds((ids) =>
        ids.filter((id) => id !== documentId),
      );
    }
  }

  function hasUnpaidFailedInstalment(document: Document) {
    return (
      document.invoicePaymentMode?.paymentMode === "INSTALMENTS" &&
      document.invoiceInstalmentPlan?.invoicePaymentInstalments.some(
        (instalment) =>
          instalment.instalmentStatus === "FAILED" ||
          instalment.instalmentStatus === "OVERDUE",
      )
    );
  }

  function renderDocumentActions(document: Document) {
    if (!isInvoiceType) {
      return canConvertEstimate(document) ? (
        <button
          type="button"
          onClick={() => void handleConvertEstimateToInvoice(document.id)}
          disabled={convertingDocumentIds.includes(document.id)}
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
          title="Transformer en facture"
          aria-label="Transformer en facture"
        >
          <FileChartColumnIncreasing className="h-4 w-4" aria-hidden="true" />
        </button>
      ) : (
        <span className="px-2 text-xs text-zinc-400">—</span>
      );
    }

    const isInstalments =
      document.invoicePaymentMode?.paymentMode === "INSTALMENTS";
    const isDraft = document.invoiceStatus === "DRAFT";
    if (document.contractStageInvoice && !isDraft) {
      const stage = document.contractStageInvoice;
      const contractUrl = `/documents/${document.sourceDocumentId ?? document.id}`;
      const actions: InvoiceMenuAction[] = [
        {
          label: "Gérer les acomptes",
          icon: FileChartColumnIncreasing,
          onSelect: () => router.push(contractUrl),
        },
      ];
      if (
        stage.kind === "DEPOSIT" &&
        document.invoiceStatus === "PENDING" &&
        !stage.payment &&
        ["ACTIVE", "PENDING"].includes(stage.plan?.mandateStatus ?? "")
      ) {
        actions.push({
          label: stage.plan?.mandateStatus === "ACTIVE" ? "Déclencher le prélèvement" : "Vérifier le mandat et déclencher",
          icon: CirclePlusIcon,
          onSelect: () => router.push(`${contractUrl}#acompte-${stage.id}`),
        });
      }
      if (stage.payment?.providerPaymentId) {
        actions.push({
          label: "Actualiser le paiement",
          icon: RefreshCw,
          onSelect: () => void handleReconcileContractStage(document),
        });
      }
      return (
        <InvoiceActionsMenu
          documentNumber={document.documentNumber}
          actions={actions}
          busy={reconcilingDocumentIds.includes(document.id)}
        />
      );
    }
    const isOneTimePending =
      !isInstalments && !document.contractStageInvoice && document.invoiceStatus === "PENDING";
    const hasUnsettledInstalment =
      isInstalments &&
      document.invoiceInstalmentPlan?.invoicePaymentInstalments.some(
        (instalment) => instalment.instalmentStatus !== "SUCCESS",
      );
    const canRefreshInstalments =
      isInstalments &&
      Boolean(document.invoiceInstalmentPlan) &&
      !isDraft &&
      document.invoiceStatus !== "PAID_MANUALLY" &&
      (hasUnsettledInstalment ||
        ["PENDING", "PAYMENT_IN_PROGRESS", "PARTIALLY_PAID", "PAID"].includes(
          document.invoiceStatus,
        ));
    const canRefreshOneTime =
      !isInstalments &&
      ["PENDING", "PAYMENT_IN_PROGRESS", "PAID"].includes(
        document.invoiceStatus,
      ) &&
      document.invoicePaymentLinks?.[0]?.provider === "GOCARDLESS";
    const actions: InvoiceMenuAction[] = [];

    if (isDraft) {
      actions.push(
        {
          label: "Valider et envoyer",
          icon: Send,
          onSelect: () => void handleSendDraftInvoice(document),
        },
        {
          label: "Supprimer le brouillon",
          icon: Trash,
          danger: true,
          onSelect: () => {
            setDraftToDelete(document);
            setIsDeleteModalOpen(true);
          },
        },
      );
    }
    if (canRefreshInstalments || canRefreshOneTime) {
      actions.push({
        label: isInstalments
          ? "Actualiser les échéances"
          : "Actualiser le paiement",
        icon: RefreshCw,
        onSelect: () => void handleReconcileInvoice(document),
      });
    }
    if (isOneTimePending) {
      actions.push({
        label: "Marquer comme payée manuellement",
        icon: Check,
        onSelect: () => openManualPaymentModal(document),
      });
    }
    if (!isInstalments && !document.contractStageInvoice && document.invoiceStatus === "PAID_MANUALLY") {
      actions.push({
        label: "Repasser en attente",
        icon: RotateCcw,
        onSelect: () => void handleManualPaymentStatus(document),
      });
    }
    if (!isInstalments && !document.contractStageInvoice && document.invoiceStatus === "REJECTED") {
      actions.push({
        label: "Envoyer un nouveau lien",
        icon: RotateCcw,
        onSelect: () => void handleRetryInvoicePayment(document.id),
      });
    }
    if (hasUnpaidFailedInstalment(document)) {
      actions.push({
        label: "Renvoyer l’autorisation bancaire",
        icon: Send,
        onSelect: () => void handleResendMandateAuthorisation(document.id),
      });
    }

    const isBusy =
      sendingDocumentIds.includes(document.id) ||
      reconcilingDocumentIds.includes(document.id) ||
      retryingDocumentIds.includes(document.id) ||
      resendingMandateDocumentIds.includes(document.id) ||
      updatingManualPaymentIds.includes(document.id);
    return actions.length ? (
      <InvoiceActionsMenu
        documentNumber={document.documentNumber}
        actions={actions}
        busy={isBusy}
      />
    ) : (
      <span className="px-2 text-xs text-zinc-400">—</span>
    );
  }

  async function handleConvertEstimateToInvoice(documentId: string) {
    setConvertingDocumentIds((ids) => [...ids, documentId]);
    const response = await convertEstimateToInvoice(documentId);
    setConvertingDocumentIds((ids) => ids.filter((id) => id !== documentId));

    if (!response.ok) {
      showToast("Impossible de transformer ce devis en facture.", "error");
      return;
    }

    router.push(`/documents/${response.data.document.id}/update-invoice`);
  }

  async function loadDocumentsPage(page: number) {
    setAllDocuments(null);
    setSearchPage(1);
    setIsLoadingPage(true);
    const status = isInvoiceType
      ? invoiceStatusFilterMatcher[selectedStatus as InvoiceSelectStatus]
      : estimateStatusFilterMatcher[selectedStatus as EstimateSelectStatus];
    const response = await getDocumentsPage(
      isInvoiceType ? "INVOICE" : "ESTIMATE",
      page,
      status,
    );
    setIsLoadingPage(false);

    if (!response.ok) {
      showToast("Impossible de charger cette page de documents.", "error");
      return;
    }

    setMasterDocumentsList(
      response.data.documents.map((document) => ({
        ...document,
        isChecked: false,
      })),
    );
    setCheckedDocuments([]);
    setCurrentPage(response.data.pagination.page);
    setTotalPages(response.data.pagination.totalPages);
    setTotalDocuments(response.data.pagination.total);
  }

  async function handlePageChange(nextPage: number) {
    if (nextPage === visibleCurrentPage || nextPage < 1 || nextPage > visibleTotalPages)
      return;
    setCheckedDocuments([]);
    if (isClientMode) {
      setSearchPage(nextPage);
      return;
    }
    await loadDocumentsPage(nextPage);
  }

  async function handleStatusChange(
    status: InvoiceSelectStatus | EstimateSelectStatus,
  ) {
    setSelectedStatus(status);
    setCheckedDocuments([]);
    if (isClientMode) {
      setSearchPage(1);
      return;
    }
    const technicalStatus = isInvoiceType
      ? invoiceStatusFilterMatcher[status as InvoiceSelectStatus]
      : estimateStatusFilterMatcher[status as EstimateSelectStatus];

    setIsLoadingPage(true);
    const response = await getDocumentsPage(
      isInvoiceType ? "INVOICE" : "ESTIMATE",
      1,
      technicalStatus,
    );
    setIsLoadingPage(false);

    if (!response.ok) {
      showToast("Impossible de filtrer les documents.", "error");
      return;
    }

    setMasterDocumentsList(
      response.data.documents.map((document) => ({
        ...document,
        isChecked: false,
      })),
    );
    setCheckedDocuments([]);
    setCurrentPage(response.data.pagination.page);
    setTotalPages(response.data.pagination.totalPages);
    setTotalDocuments(response.data.pagination.total);
  }

  function canConvertEstimate(document: Document): boolean {
    return (
      !isInvoiceType &&
      document.estimateStatus === "ACCEPTED" &&
      !document.contractPaymentPlan &&
      !document.convertedDocuments?.length
    );
  }

  function getPaginationPages(): Array<number | "ellipsis"> {
    if (visibleTotalPages <= 7) {
      return Array.from({ length: visibleTotalPages }, (_, index) => index + 1);
    }

    if (visibleCurrentPage <= 4) {
      return [1, 2, 3, 4, "ellipsis", visibleTotalPages];
    }

    if (visibleCurrentPage >= visibleTotalPages - 3) {
      return [
        1,
        "ellipsis",
        visibleTotalPages - 3,
        visibleTotalPages - 2,
        visibleTotalPages - 1,
        visibleTotalPages,
      ];
    }

    return [
      1,
      "ellipsis",
      visibleCurrentPage - 1,
      visibleCurrentPage,
      visibleCurrentPage + 1,
      "ellipsis",
      visibleTotalPages,
    ];
  }

  return (
    <div className="mt-5">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <DocumentSelector
              type={isInvoiceType ? "invoices" : "estimates"}
              selectedStatus={selectedStatus}
              onSelectStatus={handleStatusChange}
            />
            <DocumentSorter
              sortMethod={sortMethod}
              setSortMethod={(method) => {
                setSortMethod(method);
                setSearchPage(1);
                setCheckedDocuments([]);
              }}
              isOpen={isSortOpen}
              setIsOpen={setIsSortOpen}
            />
          </div>
          {hasCheckedDocuments && (
            <button
              type="button"
              className="inline-flex min-h-10 items-center gap-2 rounded-ui-control bg-ui-danger px-3 py-2 text-sm font-semibold text-white hover:brightness-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ui-primary"
              onClick={() => {
                setDraftToDelete(null);
                setIsDeleteModalOpen(true);
              }}
            >
              Supprimer les documents <Trash className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </div>
        <div className="relative w-full max-w-lg">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ui-secondary" aria-hidden="true" />
          <Input
            type="search"
            value={searchInput}
            onChange={(event) => {
              setSearchInput(event.target.value);
              setSearchPage(1);
              setCheckedDocuments([]);
            }}
            aria-label={isInvoiceType ? "Rechercher une facture" : "Rechercher un devis"}
            placeholder={`Rechercher ${isInvoiceType ? "une facture" : "un devis"} (client, numéro, montant…)`}
            className="border-ui-border pl-10"
          />
        </div>
      </div>

      {searchFailed && isClientMode && (
        <div role="alert" className="mt-4 flex flex-wrap items-center gap-3 rounded-ui-control bg-ui-danger-soft p-3 text-sm text-ui-danger">
          Impossible de charger les documents pour la recherche ou le tri.
          <button
            type="button"
            onClick={() => setSearchRetry((count) => count + 1)}
            className="rounded-md font-semibold underline focus-visible:outline-2 focus-visible:outline-ui-primary"
          >
            Réessayer
          </button>
        </div>
      )}
      {isClientMode && !isLoadingResults && !searchFailed && (
        <p role="status" className="mt-3 text-xs text-ui-secondary">
          {sortedDocuments.length} résultat{sortedDocuments.length > 1 ? "s" : ""}
        </p>
      )}

      {/* list de factures pour mobile */}
      <div className="md:hidden">
        <ul className="mt-4 space-y-3">
          {visibleDocuments.length === 0 && (
            <li className="rounded-ui-card border border-ui-border bg-ui-surface p-5 text-sm text-ui-secondary">
              {searchFailed && isClientMode
                ? "Recherche indisponible. Réessayez plus tard."
                : isLoadingResults
                ? "Chargement des documents…"
                : searchTerm
                  ? "Aucun document ne correspond à votre recherche."
                  : isInvoiceType
                    ? "Aucune facture trouvée"
                    : "Aucun devis trouvé"}
            </li>
          )}
          {visibleDocuments.map((document) => (
            <li key={document.id}>
              <div className="rounded-ui-card border border-ui-border bg-ui-surface p-4 shadow-ui-card">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 space-y-1">
                    <p className="truncate text-sm font-semibold text-zinc-900">
                      {document.clientName}
                    </p>
                    <p className="text-xs text-zinc-500">
                      {document.clientType === "BUSINESS"
                        ? "Entreprise"
                        : "Particulier"}
                    </p>
                    <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-zinc-600">
                      <Link
                        href={`/documents/${document.id}`}
                        className="font-semibold text-primary hover:underline"
                      >
                        {document.documentNumber}
                      </Link>
                      <span className="inline-block w-1 h-1 rounded-full bg-zinc-600"></span>
                      <span>{formatDate(document.paymentDueAt)}</span>
                    </div>
                    <p className="text-xs text-zinc-500">
                      {getDocumentIssueLabel(document)}
                    </p>
                    {getContractInvoiceLabel(document) && (
                      <p className="text-xs font-medium text-primary">{getContractInvoiceLabel(document)}</p>
                    )}
                  </div>

                  <div className="shrink-0 text-right">
                    <p className="text-base font-semibold text-zinc-900">
                      {document.totalPrice.toLocaleString("fr-FR", {
                        style: "currency",
                        currency: "EUR",
                      })}
                    </p>
                    <span className="mt-1 inline-flex items-center gap-2 text-xs font-semibold text-zinc-700">
                      <span
                        className={`h-2 w-2 rounded-full ${getStatusPresentation(isInvoiceType ? document.invoiceStatus : document.estimateStatus).dotClassName}`}
                      />
                      {
                        getStatusPresentation(
                          isInvoiceType
                            ? document.invoiceStatus
                            : document.estimateStatus,
                        ).label
                      }
                    </span>
                  </div>
                </div>
                {isInvoiceType && (
                  <div className="mt-4 border-t border-ui-border pt-4">
                    <p className="mb-2 text-xs font-medium text-ui-secondary">Paiement confirmé</p>
                    <PaymentGauge document={document} />
                  </div>
                )}
                <div className="mt-3 flex items-center justify-between gap-2">
                  {isInvoiceType ? (
                    <button
                      type="button"
                      onClick={() => toggleInvoiceDetails(document.id)}
                      aria-expanded={selectedInvoiceId === document.id}
                      className="inline-flex min-h-9 items-center gap-1 rounded-lg px-2 text-xs font-semibold text-ui-primary hover:bg-ui-primary-soft focus-visible:outline-2 focus-visible:outline-ui-primary"
                    >
                      Voir le suivi
                      <ChevronDown className={`h-4 w-4 transition-transform ${selectedInvoiceId === document.id ? "rotate-180" : ""}`} aria-hidden="true" />
                    </button>
                  ) : <span />}
                  {renderDocumentActions(document)}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Tableau de facture pour tablet et desktop */}
      <div className="mt-5 hidden overflow-x-auto rounded-ui-card border border-ui-border bg-ui-surface shadow-ui-card md:block">
        <table className={`${isInvoiceType ? "min-w-[1100px]" : "min-w-185"} w-full border-collapse text-left`}>
          <thead className="bg-ui-subtle text-xs uppercase tracking-wide text-ui-secondary">
            <tr>
              <th className="w-12 px-5 py-4">
                <input
                  type="checkbox"
                  aria-label="Sélectionner tous les documents de cette page"
                  className="h-4 w-4 rounded border-zinc-300"
                  checked={allChecked}
                  onChange={() => toggleCheckAll()}
                />
              </th>
              <th className="px-5 py-4 font-semibold">
                {isInvoiceType ? "Facture" : "Devis"}
              </th>
              <th className="px-5 py-4 font-semibold">Client</th>
              <th className="px-5 py-4 font-semibold">Date d&apos;échéance</th>
              <th className="px-5 py-4 font-semibold">Montant</th>
              {isInvoiceType && <th className="px-5 py-4 font-semibold">Paiement</th>}
              {isInvoiceType && <th className="px-5 py-4 font-semibold">Prochaine échéance</th>}
              <th className="px-5 py-4 font-semibold">Statut</th>
              <th className="px-5 py-4 text-right font-semibold">Action</th>
            </tr>
          </thead>
          <tbody className="text-sm text-ui-secondary">
            {visibleDocuments.length === 0 && (
              <tr className="border-t border-ui-border">
                <td colSpan={isInvoiceType ? 9 : 7} className="px-5 py-5 text-center text-zinc-500">
                  {searchFailed && isClientMode
                    ? "Recherche indisponible. Réessayez plus tard."
                    : isLoadingResults
                    ? "Chargement des documents…"
                    : searchTerm
                      ? "Aucun document ne correspond à votre recherche."
                      : isInvoiceType
                        ? "Aucune facture trouvée"
                        : "Aucun devis trouvé"}
                </td>
              </tr>
            )}

            {visibleDocuments.length > 0 &&
              visibleDocuments.map((document) => {
                const payment = isInvoiceType
                  ? getInvoicePaymentSummary(document)
                  : null;
                const nextDueDate = payment?.instalments?.length
                  ? payment.nextInstalment?.dueDate
                  : isInvoiceType && !["PAID", "PAID_MANUALLY", "DRAFT"].includes(document.invoiceStatus)
                    ? document.paymentDueAt
                    : null;
                return (
                <tr
                  key={document.id}
                  onClick={isInvoiceType ? (event) => handleInvoiceRowClick(event, document.id) : undefined}
                  className={`border-t border-ui-border transition-colors ${isInvoiceType ? "cursor-pointer hover:bg-ui-subtle/50" : "hover:bg-ui-subtle/50"} ${selectedInvoiceId === document.id ? "bg-ui-primary-soft/40" : ""}`}
                >
                  <td className="px-5 py-5 align-center">
                    <input
                      type="checkbox"
                      aria-label={`Sélectionner ${document.documentNumber ?? "ce document"}`}
                      checked={isChecked(document.id)}
                      onChange={() => handleCheckedDocumentByID(document.id)}
                      className="h-4 w-4 rounded border-zinc-300"
                    />
                  </td>
                  <td className="px-5 py-5 align-center">
                    <Link
                      href={`/documents/${document.id}`}
                      className="rounded text-ui-text underline decoration-ui-border underline-offset-4 hover:text-ui-primary focus-visible:outline-2 focus-visible:outline-ui-primary"
                    >
                      <p className="font-semibold ">
                        {document.documentNumber}
                      </p>
                    </Link>
                    <p className="mt-1 text-xs text-zinc-500">
                      {getDocumentIssueLabel(document)}
                    </p>
                    {getContractInvoiceLabel(document) && (
                      <p className="mt-1 text-xs font-medium text-primary">{getContractInvoiceLabel(document)}</p>
                    )}
                  </td>
                  <td className="px-5 py-5 align-center">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ui-primary-soft text-xs font-semibold text-ui-primary">
                        {document.clientName
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </div>
                      <div>
                        <div className="font-medium text-zinc-900">
                          {document.clientName}
                        </div>
                        <div className="text-xs text-zinc-500">
                          {document.clientType === "BUSINESS"
                            ? "Entreprise"
                            : "Particulier"}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-5 align-center">
                    <div className="font-medium text-zinc-900">
                      {formatDate(document.paymentDueAt)}
                    </div>
                    {createPaymentNote(
                      document.paymentDueAt,
                      document.invoiceStatus,
                    ) && (
                      <div className="text-xs text-rose-600">
                        {createPaymentNote(
                          document.paymentDueAt,
                          document.invoiceStatus,
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-5 py-5 align-center font-semibold text-zinc-900">
                    {document.totalPrice.toLocaleString("fr-FR", {
                      style: "currency",
                      currency: "EUR",
                    })}
                  </td>
                  {isInvoiceType && (
                    <td className="px-5 py-5 align-middle">
                      <PaymentGauge document={document} />
                    </td>
                  )}
                  {isInvoiceType && (
                    <td className="px-5 py-5 align-middle">
                      {nextDueDate ? (
                        <div>
                          <p className="font-medium text-ui-text">{formatDate(nextDueDate)}</p>
                          {payment?.nextInstalment && (
                            <p className="mt-1 text-xs text-ui-secondary">
                              Échéance {payment.nextInstalment.instalmentNumber}/{payment.instalments?.length}
                            </p>
                          )}
                          {new Date(nextDueDate) < new Date(currentDate) && (
                            <p className="mt-1 text-xs text-ui-danger">Échue</p>
                          )}
                        </div>
                      ) : <span aria-label="Aucune échéance à venir">—</span>}
                    </td>
                  )}
                  <td className="px-5 py-5 align-center">
                    <div className="flex items-center gap-2">
                      <div className="flex min-w-28 flex-col items-start gap-2">
                        <span className="inline-flex items-center gap-2 text-xs font-semibold text-zinc-500">
                          <span
                            className={`h-2 w-2 rounded-full ${getStatusPresentation(isInvoiceType ? document.invoiceStatus : document.estimateStatus).dotClassName}`}
                          />
                          {
                            getStatusPresentation(
                              isInvoiceType
                                ? document.invoiceStatus
                                : document.estimateStatus,
                            ).label
                          }
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-5 align-center">
                    <div className="flex items-center justify-end gap-2">
                      {isInvoiceType && (
                        <button
                          type="button"
                          onClick={() => toggleInvoiceDetails(document.id)}
                          aria-label={`Voir le suivi du paiement de ${document.documentNumber}`}
                          aria-expanded={selectedInvoiceId === document.id}
                          className="inline-flex h-9 items-center gap-1 rounded-lg px-2 text-xs font-semibold text-ui-primary hover:bg-ui-primary-soft focus-visible:outline-2 focus-visible:outline-ui-primary"
                        >
                          Suivi
                          <ChevronDown className={`h-4 w-4 transition-transform ${selectedInvoiceId === document.id ? "rotate-180" : ""}`} aria-hidden="true" />
                        </button>
                      )}
                      {renderDocumentActions(document)}
                    </div>
                  </td>
                </tr>
              );
              })}
          </tbody>
        </table>
      </div>

      {selectedInvoice && (
        <InvoicePaymentDetails
          document={selectedInvoice}
          statusLabel={getStatusPresentation(selectedInvoice.invoiceStatus).label}
          statusDotClassName={getStatusPresentation(selectedInvoice.invoiceStatus).dotClassName}
          onClose={() => setSelectedInvoiceId(null)}
        />
      )}

      {visibleTotalPages > 1 && (
        <nav
          className="mt-6 flex justify-center"
          aria-label="Pagination des documents"
        >
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => void handlePageChange(visibleCurrentPage - 1)}
              disabled={visibleCurrentPage === 1 || isLoadingResults}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full text-ui-secondary hover:bg-ui-subtle focus-visible:outline-2 focus-visible:outline-ui-primary disabled:cursor-not-allowed disabled:opacity-30"
              aria-label="Page précédente"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </button>
            {getPaginationPages().map((page, index) =>
              page === "ellipsis" ? (
                <span
                  key={`ellipsis-${index}`}
                  className="inline-flex h-9 w-8 items-center justify-center text-sm text-ui-secondary"
                >
                  …
                </span>
              ) : (
                <button
                  key={page}
                  type="button"
                  onClick={() => void handlePageChange(page)}
                  disabled={isLoadingResults}
                  aria-current={page === visibleCurrentPage ? "page" : undefined}
                  className={`inline-flex h-9 w-9 items-center justify-center rounded-full text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-ui-primary disabled:cursor-not-allowed ${page === visibleCurrentPage ? "bg-ui-primary-soft text-ui-primary" : "text-ui-secondary hover:bg-ui-subtle"}`}
                >
                  {page}
                </button>
              ),
            )}
            <button
              type="button"
              onClick={() => void handlePageChange(visibleCurrentPage + 1)}
              disabled={visibleCurrentPage === visibleTotalPages || isLoadingResults}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full text-ui-secondary hover:bg-ui-subtle focus-visible:outline-2 focus-visible:outline-ui-primary disabled:cursor-not-allowed disabled:opacity-30"
              aria-label="Page suivante"
            >
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </nav>
      )}

      {manualPaymentDocument && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="manual-payment-title"
        >
          <div className="w-full max-w-md rounded-ui-card border border-ui-border bg-ui-surface p-6 shadow-ui-popover">
            <h2
              id="manual-payment-title"
              className="font-title text-xl font-semibold text-ui-text"
            >
              Confirmer le paiement manuel
            </h2>
            <p className="mt-3 text-sm text-ui-secondary">
              Confirmez que la facture{" "}
              <span className="font-semibold text-zinc-800">
                {manualPaymentDocument.documentNumber}
              </span>{" "}
              a été réglée manuellement.
            </p>
            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeManualPaymentModal}
                disabled={updatingManualPaymentIds.includes(
                  manualPaymentDocument.id,
                )}
                className="min-h-11 rounded-ui-control border border-ui-border px-4 py-2 text-sm font-semibold text-ui-text hover:bg-ui-subtle focus-visible:outline-2 focus-visible:outline-ui-primary disabled:cursor-not-allowed disabled:opacity-60"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => void confirmManualPayment()}
                disabled={updatingManualPaymentIds.includes(
                  manualPaymentDocument.id,
                )}
                className="min-h-11 rounded-ui-control bg-ui-primary px-4 py-2 text-sm font-semibold text-white hover:bg-ui-primary-hover focus-visible:outline-2 focus-visible:outline-ui-primary disabled:cursor-not-allowed disabled:opacity-50"
              >
                Confirmer le paiement
              </button>
            </div>
          </div>
        </div>
      )}

      {isDeleteModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-documents-title"
        >
          <div className="flex max-h-[calc(100vh-2rem)] w-full max-w-md flex-col rounded-ui-card border border-ui-border bg-ui-surface p-6 shadow-ui-popover">
            <h2
              id="delete-documents-title"
              className="font-title text-xl font-semibold text-ui-text"
            >
              {draftToDelete
                ? "Supprimer ce brouillon ?"
                : "Supprimer les documents sélectionnés ?"}
            </h2>
            <p className="mt-3 text-sm text-ui-secondary">
              Cette action est irréversible. Les documents suivants seront
              supprimés :
            </p>
            <ul className="mt-3 min-h-0 flex-1 list-disc space-y-1 overflow-y-auto pl-5 text-sm font-semibold text-zinc-800">
              {documentsToDelete.map((document) => (
                <li key={document.id}>{document.documentNumber}</li>
              ))}
            </ul>
            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setDraftToDelete(null);
                }}
                className="min-h-11 rounded-ui-control border border-ui-border px-4 py-2 text-sm font-semibold text-ui-text hover:bg-ui-subtle focus-visible:outline-2 focus-visible:outline-ui-primary disabled:cursor-not-allowed disabled:opacity-60"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={() =>
                  void handleDeleteCheckedDocuments(
                    draftToDelete ? [draftToDelete.id] : checkedDocuments,
                  )
                }
                className="min-h-11 rounded-ui-control bg-ui-danger px-4 py-2 text-sm font-semibold text-white hover:brightness-90 focus-visible:outline-2 focus-visible:outline-ui-primary disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isDeleting ? "Suppression…" : "Supprimer définitivement"}
              </button>
            </div>
          </div>
        </div>
      )}
      {goCardlessReconnectCompanyId && (
        <GoCardlessReconnectModal
          companyId={goCardlessReconnectCompanyId}
          onClose={() => setGoCardlessReconnectCompanyId(null)}
        />
      )}
    </div>
  );
}

export default DocumentsTable;
