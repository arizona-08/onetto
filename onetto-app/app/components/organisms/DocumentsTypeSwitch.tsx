'use client';

import { useState, type ReactNode } from 'react';

interface DocumentsTypeSwitchProps {
  estimates: ReactNode;
  invoices: ReactNode;
  notice?: ReactNode;
}

type DocumentType = 'estimates' | 'invoices';

const options: Array<{ value: DocumentType; label: string }> = [
  { value: 'estimates', label: 'Devis' },
  { value: 'invoices', label: 'Factures' },
];

export default function DocumentsTypeSwitch({
  estimates,
  invoices,
  notice,
}: DocumentsTypeSwitchProps) {
  const [activeType, setActiveType] = useState<DocumentType>('estimates');

  return (
    <div className="mt-6">
      <div
        className="inline-flex rounded-xl bg-zinc-100 p-1"
        role="group"
        aria-label="Type de documents à afficher"
      >
        {options.map((option) => {
          const isActive = activeType === option.value;

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => setActiveType(option.value)}
              aria-pressed={isActive}
              className={`rounded-lg px-5 py-2 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
                isActive
                  ? 'bg-white text-zinc-900 shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-900'
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      {notice}

      <div key={activeType} className="mt-6">
        {activeType === 'estimates' ? estimates : invoices}
      </div>
    </div>
  );
}
