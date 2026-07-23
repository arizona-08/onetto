'use client';
import React from 'react'

import { CirclePlusIcon } from 'lucide-react';
import InvoiceSelector from '../molecules/InvoiceSelector';
import InvoiceSorter from '../molecules/InvoiceSorter';
import Link from 'next/link';
import { Invoice, InvoiceStatus } from '@/app/types';
import { formatDate } from '@/shared/utils';

const statusStyles: Record<string, string> = {
  OVERDUE: 'bg-rose-100 text-rose-700',
  PAID: 'bg-indigo-100 text-indigo-700',
  PENDING: 'bg-orange-200 text-orange-700',
  DRAFT: 'bg-gray-200 text-gray-700 md:bg-gray-100',
}

interface InvoiceTableProps {
  invoices: Invoice[]
  currentDate: string
}

function InvoiceTable({ invoices, currentDate }: InvoiceTableProps) {

  const [selectedStatus, setSelectedStatus] = React.useState('Toutes');
  const [sortMethod, setSortMethod] = React.useState<'date' | 'amount'>('date')
  const [isSortOpen, setIsSortOpen] = React.useState<boolean>(false);

  const [masterInvoicesList] = React.useState<Invoice[]>(invoices);

  function createPaymentNote(paymentDueAt: string, invoiceStatus: InvoiceStatus): string | undefined{
    const dueDate = new Date(paymentDueAt);
    const renderedDate = new Date(currentDate);

    if (renderedDate > dueDate && invoiceStatus !== "PAID") {
      const daysOverdue = Math.floor((renderedDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
      return `En retard de ${daysOverdue} jours`;
    }
    return
  }
  return (
    <div className="mt-3">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className=''>
          <Link href="/invoices/create" className="shadow-md my-4 flex items-center justify-center gap-3 p-4 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors cursor-pointer">
            <CirclePlusIcon />
            <span className="text-sm font-medium">Créer une facture</span>
          </Link>
        </div>
        <div className="flex items-center justify-start flex-wrap gap-5">
          <InvoiceSelector selectedStatus={selectedStatus} onSelectStatus={setSelectedStatus} />
          <InvoiceSorter sortMethod={sortMethod} setSortMethod={setSortMethod} isOpen={isSortOpen} setIsOpen={setIsSortOpen} />
        </div>
      </div>

      {/* list de factures pour mobile */}
      <div className="md:hidden">
        <ul className="mt-4 space-y-3">
          {
            masterInvoicesList.map((invoice) => (
              <li key={invoice.id}>
                <div className="bg-white px-3 py-5 rounded-md flex items-start justify-between">
                  {/* left part */}
                  <div className="space-y-1">
                    <p className="text-sm font-semibold">{invoice.clientName}</p>
                    <div className="text-gray-600 text-xs flex items-center gap-1">
                      <Link href={`/invoices/${invoice.id}`} className="underline hover:text-primary">{invoice.invoiceNumber}</Link>
                      <span className="inline-block w-1 h-1 rounded-full bg-zinc-600"></span>
                      <span>{formatDate(invoice.paymentDueAt)}</span>
                    </div>
                  </div>

                  {/* right part */}
                  <div className="flex flex-col items-end gap-1">
                    <p className="text-sm font-semibold">{invoice.totalPrice.toLocaleString("fr-FR", { style: "currency", currency: "EUR" })}</p>
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusStyles[invoice.status]}`}>{invoice.status}</span>
                  </div>
                </div>
              </li>
            ))
          }
        </ul>
      </div>

      {/* Tableau de facture pour tablet et desktop */}
      <div className="hidden md:block mt-3 overflow-x-auto rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <table className="min-w-185 w-full border-collapse text-left">
          <thead className="bg-zinc-50 text-xs font-semibold uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="w-12 px-5 py-4">
                <input type="checkbox" className="h-4 w-4 rounded border-zinc-300" />
              </th>
              <th className="px-5 py-4">Facture</th>
              <th className="px-5 py-4">Client</th>
              <th className="px-5 py-4">Date d&apos;émission</th>
              <th className="px-5 py-4">Date d&apos;échéance</th>
              <th className="px-5 py-4">Montant</th>
              <th className="px-5 py-4">Statut</th>
            </tr>
          </thead>
          <tbody className="text-sm text-zinc-700">
            {masterInvoicesList.map((invoice) => (
              <tr key={invoice.id} className="border-t border-zinc-100">
                <td className="px-5 py-5 align-top">
                  <input type="checkbox" className="h-4 w-4 rounded border-zinc-300" />
                </td>
                <td className="px-5 py-5 align-top">
                  <Link href={`/invoices/${invoice.id}`} className="underline text-zinc-900 hover:text-primary">
                    <p className="font-semibold ">{invoice.invoiceNumber}</p>
                  </Link>
                  <p className="text-xs text-zinc-500">Type de l&apos;invoice</p>
                </td>
                <td className="px-5 py-5 align-top">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700">
                      {invoice.clientName.split(' ').map((n) => n[0]).join('')}
                    </div>
                    <div className="font-medium text-zinc-900">{invoice.clientName}</div>
                  </div>
                </td>
                <td className="px-5 py-5 align-top">
                  <div className="font-medium text-zinc-900">{formatDate(invoice.createdAt)}</div>
                </td>
                <td className="px-5 py-5 align-top">
                  <div className="font-medium text-zinc-900">{formatDate(invoice.paymentDueAt)}</div>
                  {
                    createPaymentNote(invoice.paymentDueAt, invoice.status) && (
                      <div className="text-xs text-rose-600">
                        {createPaymentNote(invoice.paymentDueAt, invoice.status)}
                      </div>
                    )
                  }
                </td>
                <td className="px-5 py-5 align-top font-semibold text-zinc-900">
                  {invoice.totalPrice.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
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
    </div>
  )
}

export default InvoiceTable
