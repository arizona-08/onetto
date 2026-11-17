import type { Document } from "@/app/types";
import { formatCurrency, formatDate } from "@/shared/utils";
import { CreditCard, ExternalLink, FileText, Link2 } from "lucide-react";
import Link from "next/link";
import { getInvoicePaymentSummary } from "./invoice-payment-summary";
import InvoicePaymentDetails from "./InvoicePaymentDetails";

const invoiceStatuses: Record<string, { label: string; color: string }> = {
  DRAFT: { label: "Brouillon", color: "text-ui-secondary bg-ui-subtle" },
  PENDING: { label: "En attente", color: "text-ui-warning bg-ui-warning-soft" },
  PAYMENT_IN_PROGRESS: { label: "Paiement en cours", color: "text-ui-primary bg-ui-primary-soft" },
  PARTIALLY_PAID: { label: "Payée partiellement", color: "text-ui-primary bg-ui-primary-soft" },
  PAID: { label: "Payée", color: "text-ui-success bg-ui-success-soft" },
  PAID_MANUALLY: { label: "Payée manuellement", color: "text-ui-success bg-ui-success-soft" },
  OVERDUE: { label: "En retard", color: "text-ui-danger bg-ui-danger-soft" },
  REJECTED: { label: "Refusée", color: "text-ui-danger bg-ui-danger-soft" },
};

const invoiceStatusDots: Record<string, string> = {
  DRAFT: "bg-ui-border",
  PENDING: "bg-ui-warning",
  PAYMENT_IN_PROGRESS: "bg-ui-primary",
  PARTIALLY_PAID: "bg-ui-primary",
  PAID: "bg-ui-success",
  PAID_MANUALLY: "bg-ui-success",
  OVERDUE: "bg-ui-danger",
  REJECTED: "bg-ui-danger",
};

const estimateStatuses: Record<string, { label: string; color: string }> = {
  DRAFT: { label: "Brouillon", color: "text-ui-secondary bg-ui-subtle" },
  SENT: { label: "Envoyé", color: "text-ui-primary bg-ui-primary-soft" },
  ACCEPTED: { label: "Accepté", color: "text-ui-success bg-ui-success-soft" },
  SUPERSEDED: { label: "Remplacé", color: "text-ui-secondary bg-ui-subtle" },
  REJECTED: { label: "Refusé", color: "text-ui-danger bg-ui-danger-soft" },
};

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-ui-border py-2.5 last:border-b-0">
      <dt className="text-ui-secondary">{label}</dt>
      <dd className="max-w-[60%] break-words text-right font-medium text-ui-text">{value}</dd>
    </div>
  );
}

export default function DocumentDetailsSidebar({ document }: { document: Document }) {
  const isInvoice = document.type === "INVOICE";
  const status = isInvoice
    ? invoiceStatuses[document.invoiceStatus]
    : estimateStatuses[document.estimateStatus];
  const payment = isInvoice ? getInvoicePaymentSummary(document) : null;
  const instalmentCount = document.invoiceInstalmentPlan?.invoicePaymentInstalments.length
    ?? document.invoicePaymentMode?.numberOfInstalments;
  const lastPaidAt = payment?.instalments
    ?.filter((instalment) => instalment.instalmentStatus === "SUCCESS" && instalment.paidAt)
    .map((instalment) => instalment.paidAt!)
    .sort()
    .at(-1);
  const mandateStatus = document.contractPaymentPlan?.mandateStatus;
  const mandateLabel = mandateStatus === "ACTIVE" ? "autorisé" : mandateStatus === "PENDING" ? "en cours" : mandateStatus === "REVOKED" ? "révoqué" : "à autoriser";
  const linkedDocuments = [
    ...(document.sourceDocumentId ? [{ id: document.sourceDocumentId, label: isInvoice ? "Devis d’origine" : "Document d’origine" }] : []),
    ...(document.convertedDocuments ?? []).map((linked, index) => ({ id: linked.id, label: `Facture liée ${index + 1}` })),
    ...(document.contractPaymentPlan?.stages ?? [])
      .filter((stage) => Boolean(stage.invoice?.id))
      .map((stage) => ({ id: stage.invoice!.id, label: `${stage.kind === "DEPOSIT" ? "Facture d’acompte" : "Facture de solde"} · ${stage.invoice!.documentNumber ?? "N° en attente"}` })),
  ].filter((linked, index, all) => all.findIndex((candidate) => candidate.id === linked.id) === index);

  return (
    <aside className="min-w-0 space-y-5" aria-label="Informations complémentaires du document">
      {isInvoice && document.invoicePaymentMode?.paymentMode === "INSTALMENTS" ? (
        <InvoicePaymentDetails
          document={document}
          statusLabel={status?.label ?? document.invoiceStatus}
          statusDotClassName={invoiceStatusDots[document.invoiceStatus] ?? "bg-ui-border"}
          layout="sidebar"
        />
      ) : (
        <section className="rounded-ui-card border border-ui-border bg-ui-surface p-5 shadow-ui-card">
          <h2 className="flex items-center gap-2 font-title text-base font-semibold text-ui-text">
            <CreditCard className="h-4 w-4 text-ui-primary" aria-hidden="true" />
            {isInvoice ? "Statut du paiement" : "Statut du devis"}
          </h2>
          <span className={`mt-4 inline-flex rounded-full px-3 py-1 text-sm font-semibold ${status?.color ?? "bg-ui-subtle text-ui-secondary"}`}>
            {status?.label ?? (isInvoice ? document.invoiceStatus : document.estimateStatus)}
          </span>
          {isInvoice && payment && (
            <>
              <dl className="mt-4 text-sm">
                <DetailRow label="Montant TTC" value={formatCurrency(payment.total)} />
                <DetailRow label="Encaissé confirmé" value={payment.collected === null ? "Indisponible" : formatCurrency(payment.collected)} />
                <DetailRow label="Reste à encaisser" value={payment.collected === null ? "Indisponible" : formatCurrency(Math.max(0, payment.total - payment.collected))} />
                {lastPaidAt && <DetailRow label="Dernier encaissement" value={formatDate(lastPaidAt)} />}
                <DetailRow label="Mode" value={document.invoicePaymentMode?.paymentMode === "INSTALMENTS" ? instalmentCount ? `${instalmentCount} échéances` : "Plusieurs échéances" : "Paiement unique"} />
                {payment.nextInstalment && <DetailRow label="Prochaine échéance" value={formatDate(payment.nextInstalment.dueDate)} />}
              </dl>
              {payment.percent !== null && (
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-ui-border" role="progressbar" aria-label="Part encaissée de la facture" aria-valuemin={0} aria-valuemax={100} aria-valuenow={payment.percent}>
                  <div className={`h-full rounded-full ${payment.percent === 100 ? "bg-ui-success" : "bg-ui-primary"}`} style={{ width: `${payment.percent}%` }} />
                </div>
              )}
            </>
          )}
          {!isInvoice && document.contractPaymentPlan && (
            <p className="mt-4 text-sm text-ui-secondary">Acomptes et solde · Mandat {mandateLabel}</p>
          )}
        </section>
      )}

      <section className="rounded-ui-card border border-ui-border bg-ui-surface p-5 shadow-ui-card">
        <h2 className="flex items-center gap-2 font-title text-base font-semibold text-ui-text"><FileText className="h-4 w-4 text-ui-primary" aria-hidden="true" />Détails</h2>
        <dl className="mt-3 text-sm">
          <DetailRow label="Type" value={document.contractStageInvoice?.kind === "DEPOSIT" ? "Facture d’acompte" : document.contractStageInvoice?.kind === "BALANCE" ? "Facture de solde" : isInvoice ? "Facture" : "Devis"} />
          <DetailRow label="Numéro" value={document.documentNumber} />
          <DetailRow label={isInvoice ? "Date d’émission" : "Date du devis"} value={formatDate(document.sentAt ?? document.createdAt)} />
          <DetailRow label="Date d’échéance" value={formatDate(document.paymentDueAt)} />
          <DetailRow label="Client" value={document.clientName} />
          {document.operationNature && <DetailRow label="Opération" value={{ GOODS: "Biens", SERVICES: "Services", MIXED: "Biens et services" }[document.operationNature]} />}
        </dl>
      </section>

      <section className="rounded-ui-card border border-ui-border bg-ui-surface p-5 shadow-ui-card">
        <h2 className="flex items-center gap-2 font-title text-base font-semibold text-ui-text"><Link2 className="h-4 w-4 text-ui-primary" aria-hidden="true" />Documents liés</h2>
        {linkedDocuments.length ? (
          <ul className="mt-4 space-y-2">
            {linkedDocuments.map((linked) => (
              <li key={linked.id}>
                <Link href={`/documents/${linked.id}`} className="flex min-h-11 items-center justify-between gap-2 rounded-ui-control border border-ui-border px-3 py-2 text-sm font-medium text-ui-text hover:border-ui-primary hover:text-ui-primary focus-visible:outline-2 focus-visible:outline-ui-primary">
                  <span className="min-w-0 break-words">{linked.label}</span>
                  <ExternalLink className="h-4 w-4 shrink-0" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        ) : <p className="mt-4 text-sm text-ui-secondary">Aucun document lié.</p>}
      </section>
    </aside>
  );
}
