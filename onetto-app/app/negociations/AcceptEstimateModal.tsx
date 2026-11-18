"use client";

import { ArrowRight, ShieldCheck, X } from "lucide-react";
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

type AcceptEstimateModalProps = {
  onClose: () => void;
  onConfirm: () => void;
};

export default function AcceptEstimateModal({ onClose, onConfirm }: AcceptEstimateModalProps) {
  const cancelButton = useRef<HTMLButtonElement>(null);
  const dialog = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    cancelButton.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
      if (event.key !== "Tab" || !dialog.current) return;

      const buttons = Array.from(dialog.current.querySelectorAll<HTMLButtonElement>("button:not([disabled])"));
      const first = buttons[0];
      const last = buttons[buttons.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-slate-950/40 p-4 backdrop-blur-sm"
      onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}
    >
      <div
        ref={dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="accept-estimate-title"
        aria-describedby="accept-estimate-description"
        className="my-auto w-full max-w-md rounded-ui-card border border-ui-border bg-ui-surface p-6 text-ui-text shadow-ui-popover sm:p-7"
      >
        <div className="flex items-start justify-between gap-4">
          <span className="flex h-11 w-11 items-center justify-center rounded-ui-control bg-ui-primary-soft text-ui-primary">
            <ShieldCheck className="h-5 w-5" aria-hidden="true" />
          </span>
          <button type="button" onClick={onClose} aria-label="Fermer la confirmation" className="rounded-ui-control p-2 text-ui-secondary hover:bg-ui-subtle focus-visible:outline-2 focus-visible:outline-ui-primary">
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
        <h2 id="accept-estimate-title" className="mt-5 font-title text-xl font-semibold">Confirmer l’acceptation du devis</h2>
        <p id="accept-estimate-description" className="mt-3 text-sm leading-6 text-ui-secondary">
          En acceptant ce devis, vous allez autoriser un mandat SEPA. Une fois l’autorisation terminée, l’artisan pourra déclencher les paiements aux étapes définies dans le devis.
        </p>
        <p className="mt-3 rounded-ui-control bg-ui-primary-soft px-4 py-3 text-sm text-ui-text">
          Aucun prélèvement n’est déclenché par cette confirmation.
        </p>
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button ref={cancelButton} type="button" onClick={onClose} className="rounded-ui-control border border-ui-border bg-ui-surface px-4 py-2.5 text-sm font-medium hover:bg-ui-subtle focus-visible:outline-2 focus-visible:outline-ui-primary">
            Annuler
          </button>
          <button type="button" onClick={onConfirm} className="flex items-center justify-center gap-2 rounded-ui-control bg-ui-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-ui-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ui-primary">
            Continuer vers l’autorisation <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
