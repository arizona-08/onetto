"use client";
import React from "react";
import { ChevronDown } from "lucide-react";
import {
  EstimateSelectStatus,
  InvoiceSelectStatus,
} from "../organisms/DocumentsTable";

const INVOICES_STATUS: InvoiceSelectStatus[] = [
  "Toutes",
  "Brouillons",
  "En attente",
  "Paiement en cours",
  "Payées",
  "Échues",
  "Refusées",
];

const ESTIMATES_STATUS: EstimateSelectStatus[] = [
  "Tous",
  "Brouillons",
  "Envoyés",
  "Acceptés",
  "Refusés",
];

interface DocumentSelectorProps {
  type: "invoices" | "estimates";
  selectedStatus: InvoiceSelectStatus | EstimateSelectStatus;
  onSelectStatus: (status: InvoiceSelectStatus | EstimateSelectStatus) => void;
}
function DocumentSelector({
  type,
  selectedStatus,
  onSelectStatus,
}: DocumentSelectorProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const statusOptions =
    type === "invoices" ? INVOICES_STATUS : ESTIMATES_STATUS;

  React.useEffect(() => {
    if (!isOpen) return;
    function closeOnOutsideClick(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setIsOpen(false);
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    }
    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [isOpen]);

  return (
    <>
      <div ref={containerRef} className="relative w-full sm:hidden">
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setIsOpen((open) => !open)}
          className="flex min-h-11 w-full items-center justify-between rounded-ui-control border border-ui-border bg-ui-surface px-3 text-sm font-semibold text-ui-text transition-colors hover:bg-ui-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ui-primary"
          aria-expanded={isOpen}
          aria-controls="document-status-options"
        >
          {selectedStatus}
          <ChevronDown
            className={`h-4 w-4 text-zinc-500 transition-transform ${isOpen ? "rotate-180" : ""}`}
            aria-hidden="true"
          />
        </button>
        {isOpen && (
          <ul
            id="document-status-options"
            className="absolute z-20 mt-2 w-full overflow-hidden rounded-ui-control border border-ui-border bg-ui-surface p-1.5 shadow-ui-popover"
            role="group"
            aria-label="Filtrer par statut"
          >
            {statusOptions.map((status, index) => (
              <React.Fragment key={status}>
                {index > 0 && (
                  <li aria-hidden="true" className="mx-3 border-t border-ui-border" />
                )}
                <li>
                  <button
                    type="button"
                    onClick={() => {
                      onSelectStatus(status);
                      setIsOpen(false);
                    }}
                    className={`flex min-h-10 w-full items-center rounded-lg px-3 text-left text-sm transition-colors focus-visible:outline-2 focus-visible:outline-ui-primary ${selectedStatus === status ? "bg-ui-primary-soft font-semibold text-ui-primary" : "bg-ui-background text-ui-secondary hover:text-ui-text"}`}
                    aria-pressed={selectedStatus === status}
                  >
                    {status}
                  </button>
                </li>
              </React.Fragment>
            ))}
          </ul>
        )}
      </div>
      <div className="hidden max-w-full items-center overflow-x-auto rounded-ui-control bg-ui-background p-1 sm:inline-flex" role="group" aria-label="Filtrer par statut">
        {statusOptions.map((status, index) => (
          <React.Fragment key={status}>
            {index > 0 && (
              <span aria-hidden="true" className="mx-2 h-5 w-px shrink-0 bg-ui-control/40" />
            )}
            <button
              type="button"
              aria-pressed={selectedStatus === status}
              className={`min-h-9 shrink-0 whitespace-nowrap rounded-lg px-3 py-2 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ui-primary ${
                selectedStatus === status
                  ? "bg-ui-primary-soft font-semibold text-ui-primary shadow-[inset_0_-2px_0_0_currentColor]"
                  : "bg-ui-background text-ui-secondary hover:text-ui-text"
              }`}
              onClick={() => onSelectStatus(status)}
            >
              {status}
            </button>
          </React.Fragment>
        ))}
      </div>
    </>
  );
}

export default DocumentSelector;
