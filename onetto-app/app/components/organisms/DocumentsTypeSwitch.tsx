"use client";

import { Fragment, useState, type ReactNode } from "react";

interface DocumentsTypeSwitchProps {
  estimates: ReactNode;
  invoices: ReactNode;
  notice?: ReactNode;
}

type DocumentType = "estimates" | "invoices";

const options: Array<{ value: DocumentType; label: string }> = [
  { value: "invoices", label: "Factures" },
  { value: "estimates", label: "Devis" },
];

export default function DocumentsTypeSwitch({
  invoices,
  estimates,
  notice,
}: DocumentsTypeSwitchProps) {
  const [activeType, setActiveType] = useState<DocumentType>("invoices");

  return (
    <div className="mt-7">
      <div
        className="inline-flex items-center rounded-ui-control bg-ui-background p-1"
        role="group"
        aria-label="Type de documents à afficher"
      >
        {options.map((option, index) => {
          const isActive = activeType === option.value;

          return (
            <Fragment key={option.value}>
              {index > 0 && (
                <span aria-hidden="true" className="mx-2 h-5 w-px shrink-0 bg-ui-control/40" />
              )}
              <button
                type="button"
                onClick={() => setActiveType(option.value)}
                aria-pressed={isActive}
                className={`min-h-10 rounded-lg px-5 py-2 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ui-primary ${
                  isActive
                    ? "bg-ui-primary-soft text-ui-primary shadow-[inset_0_-2px_0_0_currentColor]"
                    : "bg-ui-background text-ui-secondary hover:text-ui-text"
                }`}
              >
                {option.label}
              </button>
            </Fragment>
          );
        })}
      </div>

      {notice}

      <div key={activeType} className="mt-6">
        {activeType === "estimates" ? estimates : invoices}
      </div>
    </div>
  );
}
