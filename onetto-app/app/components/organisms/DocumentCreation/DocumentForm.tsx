import React from 'react'
import { Info } from 'lucide-react'
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
  const paymentLimitInformation = paymentMode === 'INSTALMENTS'
    ? 'Par défaut, GoCardless limite chaque échéance à 5 000 €. Demandez un relèvement pour la devise EUR (SEPA) depuis votre tableau de bord GoCardless : Paramètres > Paramètres de la société > Transaction limits > Demander un relèvement. Il n’existe pas de plafond maximal fixe, mais un maximum de 100 000 € est recommandé.'
    : 'Par défaut, GoCardless limite un paiement unique Open Banking à 1 000 €. Vous pouvez demander un relèvement jusqu’à 15 000 € pour la devise EUR Open Banking (SEPA) depuis votre tableau de bord GoCardless : Paramètres > Paramètres de la société > Transaction limits > Demander un relèvement.'
  
  return (
    <div className="">
      <CustomerDetails client={client} onClientChange={onClientChange} documentClientErrors={errors?.documentClientErrors} disabled={lockInvoiceContent} />
      <ServiceLineItems hydratedLineItems={lineItems} hydratedDocumentDates={documentDates} onLineItemsChange={onLineItemsChange} onDocumentDatesChange={onDocumentDatesChange} documentDateErrors={errors?.documentDateErrors} documentLineItemsErrors={errors?.documentLineItemsErrors} disabled={lockInvoiceContent} />
      {showPaymentMode && (
        <section className="mx-auto mt-8 w-full max-w-2xl rounded-lg border border-zinc-200 p-5">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-zinc-900">Mode de paiement</h2>
            <div className="group relative">
              <button
                type="button"
                aria-label="Information sur le plafond des paiements uniques GoCardless"
                aria-describedby="gocardless-payment-limit-info"
                className="flex rounded-full text-zinc-500 outline-none transition-colors hover:text-primary focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                <Info className="h-4 w-4" aria-hidden="true" />
              </button>
              <div
                id="gocardless-payment-limit-info"
                role="tooltip"
                className="pointer-events-none absolute left-0 top-6 z-10 w-80 rounded-lg bg-zinc-900 px-3 py-2 text-xs font-normal leading-5 text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
              >
                {paymentLimitInformation}
              </div>
            </div>
          </div>
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
