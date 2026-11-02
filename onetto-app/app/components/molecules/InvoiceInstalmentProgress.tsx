"use client";

import type { Document } from "@/app/types";
import {
  getInstalmentRetryCapability,
  reconcileInstalmentPayments,
  retryInstalmentPayment,
  type InstalmentRetryCapability,
} from "@/lib/documents/document";
import { formatCurrency, formatDate } from "@/shared/utils";
import {
  AlertTriangle,
  CalendarClock,
  LoaderCircle,
  RotateCcw,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

interface InvoiceInstalmentProgressProps {
  document: Document;
  className?: string;
}

export default function InvoiceInstalmentProgress({
  document,
  className = "",
}: InvoiceInstalmentProgressProps) {
  const router = useRouter();
  const [capabilities, setCapabilities] = useState<
    Record<number, InstalmentRetryCapability>
  >({});
  const [retryingNumber, setRetryingNumber] = useState<number | null>(null);
  const [reconciling, setReconciling] = useState(false);
  const [confirmNumber, setConfirmNumber] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<{
    kind: "success" | "error";
    message: string;
  } | null>(null);
  const instalments =
    document.invoicePaymentMode?.paymentMode === "INSTALMENTS"
      ? document.invoiceInstalmentPlan?.invoicePaymentInstalments
      : undefined;

  const paidInstalments = (instalments ?? []).filter(
    (instalment) => instalment.instalmentStatus === "SUCCESS",
  ).length;
  const retryableInstalments = useMemo(
    () =>
      (instalments ?? []).filter((instalment) =>
        ["FAILED", "OVERDUE"].includes(instalment.instalmentStatus),
      ),
    [instalments],
  );

  useEffect(() => {
    let isActive = true;
    void Promise.all(
      retryableInstalments.map(async (instalment) => {
        const response = await getInstalmentRetryCapability(
          document.id,
          instalment.instalmentNumber,
        );
        return response.ok
          ? ([instalment.instalmentNumber, response.data] as const)
          : null;
      }),
    ).then((entries) => {
      if (!isActive) return;
      setCapabilities(
        Object.fromEntries(
          entries.filter(
            (entry): entry is readonly [number, InstalmentRetryCapability] =>
              entry !== null,
          ),
        ),
      );
    });
    return () => {
      isActive = false;
    };
  }, [document.id, retryableInstalments]);

  async function handleRetry(instalmentNumber: number) {
    if (retryingNumber !== null) return;
    setConfirmNumber(null);
    setRetryingNumber(instalmentNumber);
    setFeedback(null);
    try {
      const response = await retryInstalmentPayment(
        document.id,
        instalmentNumber,
      );
      if (response.ok) {
        setCapabilities((current) => ({
          ...current,
          [instalmentNumber]: response.data,
        }));
        setFeedback({ kind: "success", message: response.data.message });
        router.refresh();
      } else {
        const message = response.error.message;
        setFeedback({
          kind: "error",
          message: Array.isArray(message) ? message.join(" ") : message,
        });
      }
    } catch {
      setFeedback({
        kind: "error",
        message:
          "Impossible de joindre le service de paiement. Vérifiez le statut avant toute nouvelle demande.",
      });
    } finally {
      setRetryingNumber(null);
    }
  }

  async function handleReconcile() {
    if (reconciling) return;
    setReconciling(true);
    setFeedback(null);
    try {
      const response = await reconcileInstalmentPayments(document.id);
      if (response.ok) {
        setFeedback({
          kind: "success",
          message: response.data.requiresPaymentReview
            ? "Les paiements ont été actualisés. Une échéance nécessite une vérification."
            : response.data.message,
        });
        router.refresh();
      } else {
        setFeedback({
          kind: "error",
          message: "Impossible d’actualiser les paiements pour le moment. Veuillez réessayer ultérieurement.",
        });
      }
    } catch {
      setFeedback({
        kind: "error",
        message: "Impossible d’actualiser les paiements pour le moment. Veuillez réessayer ultérieurement.",
      });
    } finally {
      setReconciling(false);
    }
  }

  if (!instalments?.length) return null;

  return (
    <div className={className}>
      <div className="mb-3 flex justify-end">
        <button
          type="button"
          onClick={() => void handleReconcile()}
          disabled={reconciling}
          className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold text-zinc-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {reconciling ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
          {reconciling ? "Actualisation…" : "Actualiser les paiements"}
        </button>
      </div>
      <div className="mx-auto w-fit text-center md:hidden">
        <p className="mb-2 text-xs font-semibold text-zinc-600">
          {paidInstalments}/{instalments.length} échéance
          {instalments.length > 1 ? "s" : ""} réglée
          {paidInstalments > 1 ? "s" : ""}
        </p>
        <div
          className="flex h-2 w-40 gap-1 rounded-full"
          role="img"
          aria-label={
            paidInstalments + " échéance(s) réglée(s) sur " + instalments.length
          }
        >
          {instalments.map((instalment) => (
            <span
              key={instalment.instalmentNumber}
              title={`Échéance ${instalment.instalmentNumber} : ${formatDate(instalment.dueDate)} — ${formatCurrency(instalment.amountInCents / 100)}`}
              className={`min-w-0 flex-1 rounded-full ${instalment.instalmentStatus === "SUCCESS" ? "bg-emerald-500" : "bg-zinc-200"}`}
            />
          ))}
        </div>
      </div>
      <div
        className="hidden h-2 w-full gap-px overflow-visible rounded-full bg-zinc-100 md:flex"
        role="img"
        aria-label={
          paidInstalments + " échéance(s) réglée(s) sur " + instalments.length
        }
      >
        {instalments.map((instalment) => (
          <span
            key={instalment.instalmentNumber}
            tabIndex={0}
            className="group relative min-w-0 flex-1 outline-none focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            aria-label={`Échéance ${instalment.instalmentNumber}, prélèvement prévu le ${formatDate(instalment.dueDate)}, montant ${formatCurrency(instalment.amountInCents / 100)}`}
          >
            <span
              className={`block h-2 w-full rounded-full ${instalment.instalmentStatus === "SUCCESS" ? "bg-emerald-500" : "bg-zinc-200"}`}
            />
            <span
              role="tooltip"
              className="pointer-events-none absolute bottom-4 left-1/2 z-20 w-max -translate-x-1/2 rounded-md bg-zinc-900 px-3 py-2 text-center text-xs leading-5 text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
            >
              <span className="block font-semibold">
                Échéance {instalment.instalmentNumber}
              </span>
              <span className="block">
                Prélèvement prévu le {formatDate(instalment.dueDate)}
              </span>
              <span className="block">
                {formatCurrency(instalment.amountInCents / 100)}
              </span>
            </span>
          </span>
        ))}
      </div>
      {feedback && (
        <p
          role="status"
          className={`mt-3 rounded-lg p-3 text-sm ${
            feedback.kind === "success"
              ? "bg-emerald-50 text-emerald-900"
              : "bg-red-50 text-red-900"
          }`}
        >
          {feedback.message}
        </p>
      )}
      {retryableInstalments.map((instalment) => {
        const capability = capabilities[instalment.instalmentNumber];

        return (
          <div
            key={instalment.instalmentNumber}
            className="mt-3 rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-xs text-zinc-700"
          >
            <p className="font-semibold">
              Échéance {instalment.instalmentNumber} —{" "}
              {formatCurrency(instalment.amountInCents / 100)}
            </p>
            <p className="mt-1 text-zinc-600">
              Prévue le {formatDate(instalment.dueDate)} ·{" "}
              {instalment.instalmentStatus === "FAILED"
                ? "Échouée"
                : "En retard"}
            </p>
            {capability?.failureReason && (
              <p className="mt-1 text-zinc-600">
                Motif : {capability.failureReason}
              </p>
            )}
            {capability?.lastAttemptAt && (
              <p className="mt-1 text-zinc-600">
                Dernier essai : {formatDate(capability.lastAttemptAt)}
              </p>
            )}
            {!capability ? (
              <p className="mt-1.5 text-zinc-600">
                Vérification de la possibilité de relancer le prélèvement indisponible.
              </p>
            ) : capability.automaticRetryScheduled ? (
              <p className="mt-1.5 flex gap-2 text-primary">
                <CalendarClock className="h-4 w-4 shrink-0" />
                {capability.message}
                {capability.nextChargeDate
                  ? ` Nouvelle date : ${formatDate(capability.nextChargeDate)}.`
                  : ""}
              </p>
            ) : capability.mandateActionRequired ? (
              <div className="mt-1.5">
                <p className="flex gap-2 text-amber-800">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  {capability.message}
                </p>
                <button
                  type="button"
                  disabled
                  title="La demande de nouvelle autorisation sera disponible prochainement."
                  className="mt-2 rounded-lg border border-amber-300 bg-white px-3 py-2 font-semibold text-amber-800 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  Demander une nouvelle autorisation
                </button>
              </div>
            ) : capability.canRetryManually ? (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span>{capability.message}</span>
                <button
                  type="button"
                  onClick={() => setConfirmNumber(instalment.instalmentNumber)}
                  disabled={retryingNumber !== null}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {retryingNumber === instalment.instalmentNumber ? (
                    <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <RotateCcw className="h-3.5 w-3.5" />
                  )}
                  {retryingNumber === instalment.instalmentNumber
                    ? "Réessai…"
                    : "Retenter le prélèvement"}
                </button>
              </div>
            ) : (
              <p className="mt-1.5 text-zinc-600">{capability.message}</p>
            )}
          </div>
        );
      })}
      {confirmNumber !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-instalment-retry-title"
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
          >
            <h2
              id="confirm-instalment-retry-title"
              className="font-title text-lg font-semibold text-zinc-900"
            >
              Retenter le prélèvement ?
            </h2>
            <p className="mt-3 text-sm text-zinc-700">
              Une nouvelle tentative de prélèvement de l’échéance{" "}
              {confirmNumber} sera demandée sur le compte bancaire du client.
              Elle ne signifie pas que le paiement est déjà encaissé.
            </p>
            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmNumber(null)}
                className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => void handleRetry(confirmNumber)}
                disabled={retryingNumber !== null}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                Confirmer la tentative
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
