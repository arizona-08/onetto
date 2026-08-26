import React from 'react'
import CustomerDetails from '../../molecules/DocumentFormComponents/CustomerDetails'
import ServiceLineItems from '../../molecules/DocumentFormComponents/ServiceLineItems'
import { Client, DocumentDates, ServiceLineItem } from '@/app/types';
import { DocumentClientError, DocumentDateError, DocumentLineItemsError } from '@/shared/DocumentErrorsTypes';


interface DocumentFormProps {
  client?: Client | null;
  lineItems?: ServiceLineItem[];
  documentDates?: DocumentDates
  onClientChange: (client: Client | null) => void;
  onLineItemsChange: (lineItems: ServiceLineItem[]) => void;
  onDocumentDatesChange: (dates: DocumentDates) => void;
  errors?: {
    documentDateErrors?: DocumentDateError,
    documentClientErrors?: DocumentClientError,
    documentLineItemsErrors?: DocumentLineItemsError
  }
  lockInvoiceContent?: boolean
  showPaymentMode?: boolean
  canUseInstalments?: boolean
  paymentMode?: 'ONE_TIME' | 'INSTALMENTS'
  numberOfInstalments?: 2 | 3
  firstDueDate?: string
  minFirstDueDate?: string
  instalments?: Array<{ sequence: number; amountInCents: number; dueDate: string }>
  onPaymentModeChange?: (paymentMode: 'ONE_TIME' | 'INSTALMENTS') => void
  onNumberOfInstalmentsChange?: (numberOfInstalments: 2 | 3) => void
  onFirstDueDateChange?: (firstDueDate: string) => void
}

function DocumentForm({ client, lineItems, documentDates, onClientChange, onLineItemsChange, onDocumentDatesChange, errors, lockInvoiceContent = false, showPaymentMode = false, canUseInstalments = false, paymentMode = 'ONE_TIME', numberOfInstalments = 2, firstDueDate = '', minFirstDueDate, instalments = [], onPaymentModeChange, onNumberOfInstalmentsChange, onFirstDueDateChange }: DocumentFormProps) {
  
  return (
    <div className="">
      <CustomerDetails client={client} onClientChange={onClientChange} documentClientErrors={errors?.documentClientErrors} disabled={lockInvoiceContent} />
      <ServiceLineItems hydratedLineItems={lineItems} hydratedDocumentDates={documentDates} onLineItemsChange={onLineItemsChange} onDocumentDatesChange={onDocumentDatesChange} documentDateErrors={errors?.documentDateErrors} documentLineItemsErrors={errors?.documentLineItemsErrors} disabled={lockInvoiceContent} />
      {showPaymentMode && (
        <section className="mx-auto mt-8 w-full max-w-2xl rounded-lg border border-zinc-200 p-5">
          <h2 className="text-lg font-semibold text-zinc-900">Mode de paiement</h2>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <label className="flex cursor-pointer items-center gap-2 rounded-md border border-zinc-200 px-4 py-3 has-[:checked]:border-primary has-[:checked]:bg-primary/5">
              <input type="radio" name="paymentMode" value="ONE_TIME" checked={paymentMode === 'ONE_TIME'} onChange={() => onPaymentModeChange?.('ONE_TIME')} />
              <span>Unique</span>
            </label>
            <label
              title={!canUseInstalments ? 'Passer au plan PRO pour activer cette fonctionnalité' : undefined}
              className={`flex items-center gap-2 rounded-md border border-zinc-200 px-4 py-3 has-[:checked]:border-primary has-[:checked]:bg-primary/5 ${!canUseInstalments ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
            >
              <input type="radio" name="paymentMode" value="INSTALMENTS" checked={paymentMode === 'INSTALMENTS'} disabled={!canUseInstalments} onChange={() => onPaymentModeChange?.('INSTALMENTS')} />
              <span>Plusieurs fois</span>
            </label>
          </div>
          {!canUseInstalments && <p className="mt-3 rounded-md border border-dashed border-zinc-300 bg-zinc-50 px-3 py-2 text-sm text-zinc-500">Paiement en plusieurs fois — passer au plan PRO pour activer cette fonctionnalité.</p>}

          {paymentMode === 'INSTALMENTS' && (
            <div className="mt-5 border-t border-zinc-200 pt-5">
              <h3 className="font-medium text-zinc-900">Nombre d’échéances</h3>
              <div className="mt-3 flex gap-3">
                {[2, 3].map((count) => (
                  <label key={count} className="flex cursor-pointer items-center gap-2 rounded-md border border-zinc-200 px-4 py-3 has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                    <input type="radio" name="numberOfInstalments" value={count} checked={numberOfInstalments === count} onChange={() => onNumberOfInstalmentsChange?.(count as 2 | 3)} />
                    <span>{count} fois</span>
                  </label>
                ))}
              </div>
              <div className="mt-5">
                <label htmlFor="firstDueDate" className="block text-sm font-medium text-zinc-900">Première échéance</label>
                <input id="firstDueDate" type="date" value={firstDueDate} min={minFirstDueDate} onChange={(event) => onFirstDueDateChange?.(event.target.value)} className="mt-2 rounded-md border border-zinc-300 px-3 py-2" required />
              </div>
              <div className="mt-5 rounded-md bg-zinc-50 p-4">
                <h3 className="font-medium text-zinc-900">Échéancier</h3>
                <ul className="mt-3 space-y-2 text-sm text-zinc-700">
                  {instalments.map((instalment) => (
                    <li key={instalment.sequence} className="flex justify-between gap-4">
                      <span>{new Intl.DateTimeFormat('fr-FR').format(new Date(`${instalment.dueDate}T12:00:00`))}</span>
                      <span className="font-medium">{(instalment.amountInCents / 100).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  )
}

export default DocumentForm
