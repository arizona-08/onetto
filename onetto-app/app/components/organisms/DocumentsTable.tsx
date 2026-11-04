"use client";
import React from "react";

import {
  Check,
  ChevronLeft,
  ChevronRight,
  CirclePlusIcon,
  FileChartColumnIncreasing,
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
import InvoiceInstalmentProgress from "../molecules/InvoiceInstalmentProgress";
import InvoiceActionsMenu, {
  type InvoiceMenuAction,
} from "../molecules/InvoiceActionsMenu";
import {
  convertEstimateToInvoice,
  deleteDraftDocument,
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
  canCreate: boolean;
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
  canCreate,
  initialPagination,
}: DocumentsTableProps) {
  const isInvoiceType = type === "invoices";
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

  const [masterDocumentsList, setMasterDocumentsList] = React.useState<
    Document[]
  >(
    documents.map((document) => ({
      ...document,
      isChecked: false,
    })),
  );

  const hasCheckedDocuments = checkedDocuments.length > 0;
  const allChecked =
    checkedDocuments.length === masterDocumentsList.length &&
    masterDocumentsList.length > 0;
  const documentsToDelete = draftToDelete
    ? [draftToDelete]
    : masterDocumentsList.filter((document) =>
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
      setCheckedDocuments(masterDocumentsList.map((document) => document.id));
    }
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
      const nextTotalPages = Math.max(1, Math.ceil(nextTotal / 5));
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
          const document = masterDocumentsList.find(
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
    const isOneTimePending =
      !isInstalments && document.invoiceStatus === "PENDING";
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
    if (!isInstalments && document.invoiceStatus === "PAID_MANUALLY") {
      actions.push({
        label: "Repasser en attente",
        icon: RotateCcw,
        onSelect: () => void handleManualPaymentStatus(document),
      });
    }
    if (!isInstalments && document.invoiceStatus === "REJECTED") {
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
    if (nextPage === currentPage || nextPage < 1 || nextPage > totalPages)
      return;
    await loadDocumentsPage(nextPage);
  }

  async function handleStatusChange(
    status: InvoiceSelectStatus | EstimateSelectStatus,
  ) {
    setSelectedStatus(status);
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
      !document.convertedDocuments?.length
    );
  }

  function getPaginationPages(): Array<number | "ellipsis"> {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, index) => index + 1);
    }

    if (currentPage <= 4) {
      return [1, 2, 3, 4, "ellipsis", totalPages];
    }

    if (currentPage >= totalPages - 3) {
      return [
        1,
        "ellipsis",
        totalPages - 3,
        totalPages - 2,
        totalPages - 1,
        totalPages,
      ];
    }

    return [
      1,
      "ellipsis",
      currentPage - 1,
      currentPage,
      currentPage + 1,
      "ellipsis",
      totalPages,
    ];
  }

  return (
    <div className="mt-3">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          {canCreate && (
            <Link
              href={
                isInvoiceType
                  ? "/documents/create?type=invoice"
                  : "/documents/create"
              }
              className=" flex items-center justify-center gap-3 p-4 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors cursor-pointer"
            >
              <CirclePlusIcon />
              <span className="text-sm font-medium">
                {isInvoiceType ? "Créer une facture" : "Créer un devis"}
              </span>
            </Link>
          )}
        </div>
        <div className="flex w-full flex-col-reverse items-stretch justify-start gap-4 sm:w-auto sm:flex-row sm:items-center sm:justify-between sm:flex-wrap sm:gap-5">
          <div>
            {hasCheckedDocuments && (
              <button
                className="flex items-center gap-3 bg-red-500 text-white px-3 py-2 rounded-md text-sm"
                onClick={() => {
                  setDraftToDelete(null);
                  setIsDeleteModalOpen(true);
                }}
              >
                <span className="block md:hidden xl:block">
                  Supprimer les documents
                </span>{" "}
                <Trash className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex w-full items-center justify-start gap-3 sm:w-auto sm:flex-wrap sm:gap-5">
            <DocumentSelector
              type={isInvoiceType ? "invoices" : "estimates"}
              selectedStatus={selectedStatus}
              onSelectStatus={handleStatusChange}
            />
            <DocumentSorter
              type={isInvoiceType ? "invoices" : "estimates"}
              sortMethod={sortMethod}
              setSortMethod={setSortMethod}
              isOpen={isSortOpen}
              setIsOpen={setIsSortOpen}
            />
          </div>
        </div>
      </div>

      {/* list de factures pour mobile */}
      <div className="md:hidden">
        <ul className="mt-4 space-y-3">
          {masterDocumentsList.map((document) => (
            <li key={document.id}>
              <div className="rounded-2xl border border-zinc-200 bg-white p-4">
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
                  <div className="mt-3">
                    <InvoiceInstalmentProgress
                      document={document}
                      className="w-full"
                    />
                  </div>
                )}
                <div className="mt-3 flex justify-end">
                  {renderDocumentActions(document)}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Tableau de facture pour tablet et desktop */}
      <div className="hidden md:block mt-3 overflow-x-auto rounded-2xl border border-zinc-200 bg-white">
        <table className="min-w-185 w-full border-collapse text-left">
          <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="w-12 px-5 py-4">
                <input
                  type="checkbox"
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
              <th className="px-5 py-4 font-semibold">Statut</th>
              <th className="px-5 py-4 text-right font-semibold">Action</th>
            </tr>
          </thead>
          <tbody className="text-sm text-zinc-700">
            {masterDocumentsList.length === 0 && (
              <tr className="border-t border-zinc-100">
                <td colSpan={7} className="px-5 py-5 text-center text-zinc-500">
                  {isInvoiceType
                    ? "Aucune facture trouvée"
                    : "Aucun devis trouvé"}
                </td>
              </tr>
            )}

            {masterDocumentsList.length > 0 &&
              masterDocumentsList.map((document) => (
                <tr key={document.id} className="border-t border-zinc-100">
                  <td className="px-5 py-5 align-center">
                    <input
                      type="checkbox"
                      checked={isChecked(document.id)}
                      onChange={() => handleCheckedDocumentByID(document.id)}
                      className="h-4 w-4 rounded border-zinc-300"
                    />
                  </td>
                  <td className="px-5 py-5 align-center">
                    <Link
                      href={`/documents/${document.id}`}
                      className="underline text-zinc-900 hover:text-primary"
                    >
                      <p className="font-semibold ">
                        {document.documentNumber}
                      </p>
                    </Link>
                    <p className="mt-1 text-xs text-zinc-500">
                      {getDocumentIssueLabel(document)}
                    </p>
                  </td>
                  <td className="px-5 py-5 align-center">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700">
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
                        {isInvoiceType && (
                          <InvoiceInstalmentProgress
                            document={document}
                            className="w-full"
                          />
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-5 align-center">
                    <div className="flex justify-end">
                      {renderDocumentActions(document)}
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <nav
          className="mt-6 flex justify-center"
          aria-label="Pagination des documents"
        >
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => void handlePageChange(currentPage - 1)}
              disabled={currentPage === 1 || isLoadingPage}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full text-zinc-600 hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-30"
              aria-label="Page précédente"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </button>
            {getPaginationPages().map((page, index) =>
              page === "ellipsis" ? (
                <span
                  key={`ellipsis-${index}`}
                  className="inline-flex h-9 w-8 items-center justify-center text-sm text-zinc-500"
                >
                  …
                </span>
              ) : (
                <button
                  key={page}
                  type="button"
                  onClick={() => void handlePageChange(page)}
                  disabled={isLoadingPage}
                  aria-current={page === currentPage ? "page" : undefined}
                  className={`inline-flex h-9 w-9 items-center justify-center rounded-full text-sm font-medium transition-colors disabled:cursor-not-allowed ${page === currentPage ? "bg-zinc-100 text-zinc-900" : "text-zinc-600 hover:bg-zinc-100"}`}
                >
                  {page}
                </button>
              ),
            )}
            <button
              type="button"
              onClick={() => void handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages || isLoadingPage}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full text-zinc-600 hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-30"
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
          <div className="w-full max-w-md rounded-lg bg-white p-6">
            <h2
              id="manual-payment-title"
              className="font-title text-xl font-semibold text-zinc-900"
            >
              Confirmer le paiement manuel
            </h2>
            <p className="mt-3 text-sm text-zinc-600">
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
                className="rounded-md border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => void confirmManualPayment()}
                disabled={updatingManualPaymentIds.includes(
                  manualPaymentDocument.id,
                )}
                className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
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
          <div className="flex max-h-[calc(100vh-2rem)] w-full max-w-md flex-col rounded-lg bg-white p-6">
            <h2
              id="delete-documents-title"
              className="font-title text-xl font-semibold text-zinc-900"
            >
              {draftToDelete
                ? "Supprimer ce brouillon ?"
                : "Supprimer les documents sélectionnés ?"}
            </h2>
            <p className="mt-3 text-sm text-zinc-600">
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
                className="rounded-md border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700 disabled:cursor-not-allowed disabled:opacity-60"
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
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
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
