"use client";

import type { Document } from "@/app/types";
import { formatCurrency, formatDate } from "@/shared/utils";
import { Check, CircleAlert, Clock3, X } from "lucide-react";
import Link from "next/link";
import InvoiceInstalmentProgress from "../molecules/InvoiceInstalmentProgress";
import { getInvoicePaymentSummary } from "./invoice-payment-summary";

type Instalment = NonNullable<
  NonNullable<Document["invoiceInstalmentPlan"]>["invoicePaymentInstalments"]
>[number];

const instalmentStatus: Record<
  Instalment["instalmentStatus"],
  { label: string; className: string }
> = {
  PENDING: { label: "À venir", className: "text-ui-secondary" },
  PAYMENT_IN_PROGRESS: { label: "En cours", className: "text-ui-primary" },
  SUCCESS: { label: "Payée", className: "text-ui-success" },
  FAILED: { label: "Échouée", className: "text-ui-danger" },
  OVERDUE: { label: "En retard", className: "text-ui-danger" },
};

export function PaymentGauge({ document }: { document: Document }) {
  const { collected, total, percent, instalments } =
    getInvoicePaymentSummary(document);

  if (percent === null || collected === null) {
    return <span className="text-xs text-ui-secondary">Montant encaissé indisponible</span>;
  }

  return (
    <div className="min-w-32 max-w-48">
      <p className="whitespace-nowrap text-xs font-medium text-ui-text">
        {formatCurrency(collected)} / {formatCurrency(total)}
      </p>
      <div
        className="mt-1.5 h-2 overflow-hidden rounded-full bg-ui-border"
        role="progressbar"
        aria-label={`Paiement de ${document.documentNumber}${instalments ? `, ${instalments.filter((item) => item.instalmentStatus === "SUCCESS").length} échéance(s) réglée(s) sur ${instalments.length}` : ""}`}
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuetext={`${formatCurrency(collected)} encaissés sur ${formatCurrency(total)}`}
      >
        <div
          className={`h-full rounded-full ${percent === 100 ? "bg-ui-success" : "bg-ui-primary"}`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

export default function InvoicePaymentDetails({
  document,
  onClose,
  statusLabel,
  statusDotClassName,
}: {
  document: Document;
  onClose: () => void;
  statusLabel: string;
  statusDotClassName: string;
}) {
  const summary = getInvoicePaymentSummary(document);
  const isInstalments =
    document.invoicePaymentMode?.paymentMode === "INSTALMENTS";
  const unpaid = summary.collected === null
    ? null
    : Math.max(0, summary.total - summary.collected);
  const instalmentCount =
    summary.instalments?.length ?? document.invoicePaymentMode?.numberOfInstalments;

  return (
    <section
      aria-label={`Suivi du paiement de ${document.documentNumber}`}
      className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]"
    >
      <div className="rounded-ui-card border border-ui-border bg-ui-surface p-5 shadow-ui-card sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-title text-xl font-semibold text-ui-text">
              {document.documentNumber}
            </h3>
            <p className="mt-1 truncate text-sm text-ui-secondary">
              {document.clientName}
            </p>
            <p className="mt-2 inline-flex items-center gap-2 text-xs font-semibold text-ui-secondary">
              <span className={`h-2 w-2 rounded-full ${statusDotClassName}`} aria-hidden="true" />
              {statusLabel}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer le suivi du paiement"
            className="rounded-lg p-2 text-ui-secondary hover:bg-ui-subtle focus-visible:outline-2 focus-visible:outline-ui-primary"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <p className="mt-5 font-title text-2xl font-semibold text-ui-text">
          {formatCurrency(summary.total)}
        </p>
        <p className="mt-1 text-xs text-ui-secondary">Montant TTC de la facture</p>
        <dl className="mt-5 divide-y divide-ui-border text-sm">
          <div className="flex justify-between gap-3 py-2">
            <dt className="text-ui-secondary">Mode de paiement</dt>
            <dd className="font-medium text-ui-text">
              {isInstalments
                ? instalmentCount
                  ? `${instalmentCount} échéances`
                  : "Paiement en plusieurs fois"
                : "Paiement unique"}
            </dd>
          </div>
          <div className="flex justify-between gap-3 py-2">
            <dt className="text-ui-secondary">Encaissé confirmé</dt>
            <dd className="font-semibold text-ui-text">
              {summary.collected === null ? "Indisponible" : formatCurrency(summary.collected)}
            </dd>
          </div>
          <div className="flex justify-between gap-3 py-2">
            <dt className="text-ui-secondary">Reste à encaisser</dt>
            <dd className="font-semibold text-ui-text">
              {unpaid === null ? "Indisponible" : formatCurrency(unpaid)}
            </dd>
          </div>
        </dl>
        <div className="mt-5"><PaymentGauge document={document} /></div>
        <Link
          href={`/documents/${document.id}`}
          className="mt-5 inline-flex min-h-10 items-center rounded-ui-control border border-ui-border px-3 py-2 text-sm font-semibold text-ui-text hover:bg-ui-subtle focus-visible:outline-2 focus-visible:outline-ui-primary"
        >
          Voir la facture
        </Link>
      </div>

      <div className="rounded-ui-card border border-ui-border bg-ui-surface p-5 shadow-ui-card sm:p-6">
        <h3 className="font-title text-lg font-semibold text-ui-text">
          {isInstalments ? "Échéancier et paiements" : "Détails du paiement"}
        </h3>
        {summary.instalments?.length ? (
          <>
            <ol className="mt-4 divide-y divide-ui-border">
              {summary.instalments.map((instalment) => {
                const status = instalmentStatus[instalment.instalmentStatus];
                const settled = instalment.instalmentStatus === "SUCCESS";
                const failed = ["FAILED", "OVERDUE"].includes(instalment.instalmentStatus);
                return (
                  <li key={instalment.instalmentNumber} className="flex flex-wrap items-start gap-3 py-4">
                    <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${settled ? "border-ui-success bg-ui-success-soft text-ui-success" : failed ? "border-ui-danger bg-ui-danger-soft text-ui-danger" : "border-ui-primary bg-ui-surface text-ui-primary"}`}>
                      {settled ? <Check className="h-4 w-4" aria-hidden="true" /> : failed ? <CircleAlert className="h-4 w-4" aria-hidden="true" /> : <span className="h-2 w-2 rounded-full bg-current" />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-ui-text">Échéance {instalment.instalmentNumber}/{summary.instalments?.length}</p>
                      <p className="mt-0.5 text-xs text-ui-secondary">
                        {settled && instalment.paidAt
                          ? `Encaissée le ${formatDate(instalment.paidAt)}`
                          : `Prévue le ${formatDate(instalment.dueDate)}`}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-ui-text">{formatCurrency(instalment.amountInCents / 100)}</p>
                      <p className={`mt-1 text-xs font-medium ${status.className}`}>{status.label}</p>
                    </div>
                  </li>
                );
              })}
            </ol>
            <InvoiceInstalmentProgress document={document} className="mt-2" showProgress={false} />
          </>
        ) : (
          <div className="mt-5 flex items-start gap-3 rounded-ui-control bg-ui-subtle p-4 text-sm text-ui-secondary">
            <Clock3 className="h-4 w-4 shrink-0" aria-hidden="true" />
            <p>
              {isInstalments
                ? "Les détails de l’échéancier ne sont pas disponibles."
                : ["PAID", "PAID_MANUALLY"].includes(document.invoiceStatus)
                  ? "Le règlement de cette facture est confirmé."
                  : `Date d’échéance : ${formatDate(document.paymentDueAt)}.`}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
