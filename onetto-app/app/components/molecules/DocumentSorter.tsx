"use client";

import { SortDesc } from "lucide-react";
import React from "react";

interface DocumentSorterProps {
  sortMethod: "date" | "amount";
  setSortMethod: (sort: "date" | "amount") => void;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

export default function DocumentSorter({
  sortMethod,
  setSortMethod,
  isOpen,
  setIsOpen,
}: DocumentSorterProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const triggerRef = React.useRef<HTMLButtonElement>(null);

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
  }, [isOpen, setIsOpen]);

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-controls="document-sort-options"
        className="inline-flex min-h-10 items-center gap-2 rounded-ui-control bg-ui-background px-3 py-2 text-sm font-medium text-ui-secondary transition-colors hover:text-ui-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ui-primary"
      >
        <SortDesc className="h-4 w-4" aria-hidden="true" />
        Trier
      </button>
      {isOpen && (
        <div
          id="document-sort-options"
          className="absolute right-0 top-full z-30 mt-2 min-w-36 rounded-ui-control border border-ui-border bg-ui-surface p-1.5 shadow-ui-popover"
          role="group"
          aria-label="Trier les documents"
        >
          {([["date", "Date"], ["amount", "Montant"]] as const).map(([value, label]) => (
            <button
              key={value}
              type="button"
              aria-pressed={sortMethod === value}
              onClick={() => {
                setSortMethod(value);
                setIsOpen(false);
              }}
              className={`block min-h-10 w-full rounded-lg px-3 text-left text-sm transition-colors focus-visible:outline-2 focus-visible:outline-ui-primary ${sortMethod === value ? "bg-ui-primary-soft font-semibold text-ui-primary" : "bg-ui-background text-ui-secondary hover:text-ui-text"}`}
            >
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
