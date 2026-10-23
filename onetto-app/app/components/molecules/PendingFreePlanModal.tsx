"use client";

import { useEffect, useRef } from "react";

type PendingFreePlanModalProps = {
  selectedPlan: string;
  isCanceling: boolean;
  onClose: () => void;
  onCancelPendingFree: () => void;
};

export default function PendingFreePlanModal({
  selectedPlan,
  isCanceling,
  onClose,
  onCancelPendingFree,
}: PendingFreePlanModalProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeButtonRef.current?.focus();

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape" && !isCanceling) {
        onClose();
      }
    }

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isCanceling, onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="pending-free-plan-title"
      aria-describedby="pending-free-plan-description"
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/40 p-4"
    >
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h2
          id="pending-free-plan-title"
          className="font-title text-xl font-semibold text-zinc-900"
        >
          Annulez d’abord le passage au gratuit
        </h2>
        <p
          id="pending-free-plan-description"
          className="mt-3 text-sm leading-6 text-zinc-600"
        >
          Votre passage à l’offre gratuite est programmé. Pour choisir l’offre{" "}
          {selectedPlan}, annulez d’abord ce changement. Vous pourrez ensuite
          sélectionner cette offre à nouveau.
        </p>
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            disabled={isCanceling}
            className="rounded-xl border border-zinc-200 px-4 py-2.5 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20 disabled:opacity-50"
          >
            Fermer
          </button>
          <button
            type="button"
            onClick={onCancelPendingFree}
            disabled={isCanceling}
            className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20 disabled:opacity-50"
          >
            {isCanceling
              ? "Annulation en cours…"
              : "Annuler le passage au gratuit"}
          </button>
        </div>
      </div>
    </div>
  );
}
