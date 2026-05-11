'use client';
import React from 'react'

const INVOICES_STATUS = ['Toutes', 'En attente', 'Payées', 'Échues']

interface InvoiceSelectorProps {
  selectedStatus: string;
  onSelectStatus: (status: string) => void;
}
function InvoiceSelector({ selectedStatus, onSelectStatus }: InvoiceSelectorProps) {
  return (
    <div className="flex items-center gap-1 w-fit bg-gray-600/10 p-1 rounded-lg shadow-sm">
      {INVOICES_STATUS.map((status) => (
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
  )
}

export default InvoiceSelector