'use client';
import React from 'react'
import { ChevronDown } from 'lucide-react';
import { EstimateSelectStatus, InvoiceSelectStatus } from '../organisms/DocumentsTable';

const INVOICES_STATUS: InvoiceSelectStatus[] = [
  'Toutes',
  'Brouillons',
  'En attente',
  'Paiement en cours',
  'Payées',
  'Échues',
  'Refusées',
];

const ESTIMATES_STATUS: EstimateSelectStatus[] = [
  'Tous',
  'Brouillons',
  'Envoyés',
  'Acceptés',
  'Refusés',
];

interface DocumentSelectorProps {
  type: 'invoices' | 'estimates';
  selectedStatus: InvoiceSelectStatus | EstimateSelectStatus;
  onSelectStatus: (status: InvoiceSelectStatus | EstimateSelectStatus) => void;
}
function DocumentSelector({ type, selectedStatus, onSelectStatus }: DocumentSelectorProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const statusOptions = type === 'invoices'
    ? INVOICES_STATUS
    : ESTIMATES_STATUS;

  return (
    <>
      <div className="relative w-full sm:hidden">
        <button
          type="button"
          onClick={() => setIsOpen((open) => !open)}
          className="flex min-h-11 w-full items-center justify-between rounded-xl border border-zinc-200 bg-white px-3 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-primary/15"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
        >
          {selectedStatus}
          <ChevronDown className={`h-4 w-4 text-zinc-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
        </button>
        {isOpen && (
          <ul className="absolute z-20 mt-2 w-full overflow-hidden rounded-xl border border-zinc-200 bg-white p-1.5 shadow-lg" role="listbox">
            {statusOptions.map((status) => (
              <li key={status}>
                <button
                  type="button"
                  onClick={() => {
                    onSelectStatus(status);
                    setIsOpen(false);
                  }}
                  className={`flex min-h-10 w-full items-center rounded-lg px-3 text-left text-sm transition-colors ${selectedStatus === status ? 'bg-primary/10 font-semibold text-primary' : 'text-zinc-700 hover:bg-zinc-50'}`}
                  role="option"
                  aria-selected={selectedStatus === status}
                >
                  {status}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="hidden w-fit items-center gap-1 rounded-lg bg-gray-600/10 p-1 sm:flex">
      {statusOptions.map((status) => (
        <button
          key={status}
          className={`p-2 rounded-lg transition-colors text-xs ${
            selectedStatus === status
              ? 'bg-white text-zinc-700'
              : 'text-zinc-700 hover:bg-gray-600/20'
          }`}
          onClick={() => onSelectStatus(status)}
        >
          {status}
        </button>
      ))}
      </div>
    </>
  )
}

export default DocumentSelector
