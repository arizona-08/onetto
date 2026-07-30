'use client';
import React from 'react'
import { EstimateSelectStatus, InvoiceSelectStatus } from '../organisms/DocumentsTable';

const INVOICES_STATUS = ['Toutes', 'En attente', 'Payées', 'Échues']
const ESTIMATES_STATUS = ['Tout', 'Brouillons', 'Envoyés', 'Acceptés', 'Refusés']

interface DocumentSelectorProps {
  type: 'invoices' | 'estimates';
  selectedStatus: InvoiceSelectStatus | EstimateSelectStatus;
  onSelectStatus: (status: InvoiceSelectStatus | EstimateSelectStatus) => void;
}
function DocumentSelector({ type, selectedStatus, onSelectStatus }: DocumentSelectorProps) {
  const statusOptions = type === 'invoices' ? INVOICES_STATUS : ESTIMATES_STATUS;

  return (
    <div className="flex items-center gap-1 w-fit bg-gray-600/10 p-1 rounded-lg shadow-sm">
      {statusOptions.map((status) => (
        <button
          key={status}
          className={`p-2 rounded-lg transition-colors text-xs ${
            selectedStatus === status
              ? 'bg-white text-zinc-700'
              : 'text-zinc-700 hover:bg-gray-600/20'
          }`}
          onClick={() => onSelectStatus(status as InvoiceSelectStatus | EstimateSelectStatus)}
        >
          {status}
        </button>
      ))}
    </div>
  )
}

export default DocumentSelector