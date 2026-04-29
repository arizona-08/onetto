'use client';
import React from 'react'
import InvoiceSelector from './InvoiceSelector'
import InvoiceSorter from './InvoiceSorter';

const invoices = [
  {
    id: 'INV-8802',
    type: 'Software Consulting',
    customer: 'Acme Labs Inc.',
    initials: 'AL',
    date: 'Oct 12, 2023',
    note: 'DUE 4 DAYS AGO',
    amount: '$12,450.00',
    status: 'OVERDUE',
  },
  {
    id: 'INV-8799',
    type: 'Brand Identity',
    customer: 'Nexus Partners',
    initials: 'NP',
    date: 'Oct 10, 2023',
    note: 'Paid on Oct 11',
    amount: '$5,200.00',
    status: 'PAID',
  },
  {
    id: 'INV-8795',
    type: 'Website Overhaul',
    customer: 'Global Tech Corp',
    initials: 'GT',
    date: 'Oct 08, 2023',
    note: 'Due in 14 days',
    amount: '$24,900.00',
    status: 'PENDING',
  },
  {
    id: 'INV-8790',
    type: 'Maintenance Retainer',
    customer: 'Blue Valley Co.',
    initials: 'BV',
    date: 'Oct 05, 2023',
    note: 'DUE 11 DAYS AGO',
    amount: '$1,500.00',
    status: 'OVERDUE',
  },
]

const statusStyles: Record<string, string> = {
  OVERDUE: 'bg-rose-100 text-rose-700',
  PAID: 'bg-indigo-100 text-indigo-700',
  PENDING: 'bg-zinc-200 text-zinc-700',
}

function InvoiceTable() {

  const [selectedStatus, setSelectedStatus] = React.useState('Toutes');
  const [sortMethod, setSortMethod] = React.useState<'date' | 'amount'>('date')
  const [isSortOpen, setIsSortOpen] = React.useState<boolean>(false)
  return (
    <>
      <div className="flex items-center justify-between">
        <InvoiceSelector selectedStatus={selectedStatus} onSelectStatus={setSelectedStatus} />
        <InvoiceSorter sortMethod={sortMethod} setSortMethod={setSortMethod} isOpen={isSortOpen} setIsOpen={setIsSortOpen} />
      </div>
      <div className="mt-3 overflow-x-auto rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <table className="min-w-185 w-full border-collapse text-left">
          <thead className="bg-zinc-50 text-xs font-semibold uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="w-12 px-5 py-4">
                <input type="checkbox" className="h-4 w-4 rounded border-zinc-300" />
              </th>
              <th className="px-5 py-4">Invoice</th>
              <th className="px-5 py-4">Customer</th>
              <th className="px-5 py-4">Date</th>
              <th className="px-5 py-4">Amount</th>
              <th className="px-5 py-4">Status</th>
            </tr>
          </thead>
          <tbody className="text-sm text-zinc-700">
            {invoices.map((invoice) => (
              <tr key={invoice.id} className="border-t border-zinc-100">
                <td className="px-5 py-5 align-top">
                  <input type="checkbox" className="h-4 w-4 rounded border-zinc-300" />
                </td>
                <td className="px-5 py-5 align-top">
                  <div className="font-semibold text-zinc-900">#{invoice.id}</div>
                  <div className="text-xs text-zinc-500">{invoice.type}</div>
                </td>
                <td className="px-5 py-5 align-top">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700">
                      {invoice.initials}
                    </div>
                    <div className="font-medium text-zinc-900">{invoice.customer}</div>
                  </div>
                </td>
                <td className="px-5 py-5 align-top">
                  <div className="font-medium text-zinc-900">{invoice.date}</div>
                  <div className="text-xs text-rose-600">
                    {invoice.note}
                  </div>
                </td>
                <td className="px-5 py-5 align-top font-semibold text-zinc-900">
                  {invoice.amount}
                </td>
                <td className="px-5 py-5 align-top">
                  <span
                    className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${statusStyles[invoice.status]}`}
                  >
                    {invoice.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

export default InvoiceTable