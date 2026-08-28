'use client'

import { Document, DocumentService } from '@/app/types'
import { formatDate } from '@/shared/utils'
import { Landmark } from 'lucide-react'
import React from 'react'
import { useActiveCompany } from '../../context/ActiveCompanyContext'
import { useAuthUser } from '../../context/AuthUserContext'
import DocumentVersionSelector from '../DocumentVersionSelector'

interface DocumentDisplayComponentProps {
  document: Document
}

const fallbackCompany = {
  name: 'Atelier Onetto Studio',
  address: '14 avenue de la République',
  postalCode: '75011',
  city: 'Paris',
  siren: '918 245 637',
  vatNumber: 'FR 32 918245637',
  phoneNumber: '',
  iban: 'FR76 3000 1007 9412 3456 7890 123',
  bic: 'SOGEFRPP',
}

const currency = (amount: number) => amount.toLocaleString('fr-FR', {
  style: 'currency',
  currency: 'EUR',
})

function getServiceValues(serviceLine: DocumentService) {
  return {
    description: serviceLine.description,
    quantity: serviceLine.quantity,
    unitPrice: serviceLine.unitPrice,
    unit: serviceLine.unit,
    taxRate: serviceLine.taxRate,
  }
}

function DocumentDisplayComponent({ document }: DocumentDisplayComponentProps) {
  const { user } = useAuthUser()
  const { activeCompany } = useActiveCompany()
  const isInvoice = document.type === 'INVOICE'
  const services = document.services ?? []
  const companyName = activeCompany?.name ?? fallbackCompany.name
  const companyAddress = activeCompany?.address ?? fallbackCompany.address
  const companyPostalCode = activeCompany?.postalCode ?? fallbackCompany.postalCode
  const companyCity = activeCompany?.city ?? fallbackCompany.city
  const companySiren = activeCompany?.siren ?? fallbackCompany.siren
  const companyVatNumber = activeCompany?.vatNumber ?? fallbackCompany.vatNumber
  const companyPhoneNumber = activeCompany?.phoneNumber ?? fallbackCompany.phoneNumber
  const companyIban = activeCompany?.IBAN ?? fallbackCompany.iban
  const companyBic = activeCompany?.BIC ?? fallbackCompany.bic
  const contactEmail = document.author?.email ?? user?.email ?? ''

  const totalHT = services.reduce((sum, serviceLine) => {
    const { quantity, unitPrice } = getServiceValues(serviceLine)
    return sum + unitPrice * quantity
  }, 0)
  const totalTVA = services.reduce((sum, serviceLine) => {
    const { quantity, unitPrice, taxRate } = getServiceValues(serviceLine)
    return sum + unitPrice * quantity * taxRate / 100
  }, 0)
  const totalTTC = totalHT + totalTVA

  return (
    <>
      <article className="mx-auto mt-6 w-full max-w-2xl overflow-hidden rounded-md bg-white text-xs leading-relaxed text-zinc-950-[0_24px_70px_-45px_rgba(15,23,42,0.45)] print:mt-0 print:max-w-none print:rounded-none print:">
        <div className="flex justify-end px-7 pt-5 print:hidden"><DocumentVersionSelector documentId={document.id} versionNumber={document.versionNumber} mode="display" /></div>
        <header className="px-7 py-6">
          <div className="flex items-start justify-between gap-6">
            <div className="-space-y-4">
              <p className="flex flex-col font-title text-7xl font-medium uppercase tracking-tighter text-primary">
                {isInvoice ? 'Facture' : 'Devis'}
              </p>
              <span className="inline-block rounded-full border border-black bg-white px-2 py-1 text-xs">
                n° {document.documentNumber}
              </span>

              <div className="mt-5 flex flex-col gap-2">
                <div>
                  <p className="font-semibold text-zinc-500">
                    {isInvoice ? 'Date d’émission' : 'Date du devis'}
                  </p>
                  <p>{formatDate(isInvoice ? (document.sentAt ?? new Date().toISOString()) : document.createdAt)}</p>
                </div>

                <div>
                  <p className="font-semibold text-zinc-500">Date d’échéance</p>
                  <p>{formatDate(document.paymentDueAt)}</p>
                </div>
              </div>
            </div>

            <div className="h-20 w-20 rounded-md bg-primary" />
          </div>

          <hr className="mt-10 inline-block w-full text-primary" />

          <div className="mt-7 grid gap-6 md:grid-cols-2">
            <section>
              <div className="space-y-0.5">
                <p className="min-h-5 font-title text-lg font-semibold">{companyName}</p>
                <p>Statut : Micro-entreprise</p>
                <p>SIREN : {companySiren}</p>
                <p>TVA intracommunautaire : {companyVatNumber}</p>
                <p>Téléphone : {companyPhoneNumber}</p>
                <p>Email : {contactEmail}</p>
                <p className="min-h-4">{companyAddress}</p>
                <p className="min-h-4">
                  {companyPostalCode}, {companyCity}
                </p>
              </div>
            </section>

            <section className="text-right">
              <p className="mb-2 font-semibold uppercase text-zinc-500">À l’attention de</p>
              <div className="space-y-0.5">
                <p className="min-h-5 font-title text-lg font-semibold">{document.clientName}</p>
                <p>{document.clientEmail}</p>
                <p>{document.clientAddress}</p>
                <p>
                  {document.clientPostalCode}, {document.clientCity}, {document.clientCountry}
                </p>
              </div>
            </section>
          </div>
        </header>

        <div className="px-7 py-6">
          <div className="space-y-3 sm:hidden">
            {services.length > 0 ? services.map((serviceLine) => {
              const { description, quantity, unitPrice, unit, taxRate } = getServiceValues(serviceLine)
              const lineTotalHT = quantity * unitPrice
              const lineTotalTTC = lineTotalHT * (1 + taxRate / 100)

              return (
                <article
                  key={serviceLine.id}
                  className="rounded-xl border border-zinc-200 bg-zinc-50/70 p-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <p className="font-semibold text-zinc-900">{description}</p>
                    <p className="shrink-0 font-title text-sm font-semibold text-primary">
                      {currency(lineTotalTTC)}
                    </p>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3 border-t border-zinc-200 pt-3 text-[11px]">
                    <ServiceDetail label="Quantité" value={`${quantity} ${unit}`} />
                    <ServiceDetail label="Prix HT" value={currency(unitPrice)} align="right" />
                    <ServiceDetail label="TVA" value={`${taxRate} %`} />
                    <ServiceDetail label="Total HT" value={currency(lineTotalHT)} align="right" />
                  </div>
                </article>
              )
            }) : (
              <div className="rounded-xl border border-dashed border-zinc-200 px-4 py-6 text-center text-xs text-zinc-500">
                Aucune prestation.
              </div>
            )}
          </div>

          <div className="hidden overflow-hidden sm:block">
            <table className="w-full table-fixed border-collapse text-left text-[10px]">
              <colgroup>
                <col className="w-[37%]" />
                <col className="w-[7%]" />
                <col className="w-[13%]" />
                <col className="w-[12%]" />
                <col className="w-[7%]" />
                <col className="w-[12%]" />
                <col className="w-[12%]" />
              </colgroup>
              <thead className="whitespace-nowrap bg-primary/10">
                <tr className="border-b border-zinc-200 font-semibold uppercase text-zinc-600">
                  <th className="py-2.5 pl-1 pr-1.5">Description</th>
                  <th className="px-1.5 py-2.5">Qté</th>
                  <th className="px-1.5 py-2.5">Prix HT</th>
                  <th className="px-1.5 py-2.5">Unité</th>
                  <th className="px-1.5 py-2.5">TVA</th>
                  <th className="px-1.5 py-2.5 text-right">Total HT</th>
                  <th className="py-2.5 pl-1.5 pr-1 text-right">Total TTC</th>
                </tr>
              </thead>
              <tbody>
                {services.length > 0
                  ? services.map((serviceLine) => {
                      const { description, quantity, unitPrice, unit, taxRate } = getServiceValues(serviceLine)
                      const lineTotalHT = quantity * unitPrice
                      const lineTotalTTC = lineTotalHT * (1 + taxRate / 100)

                      return (
                        <tr key={serviceLine.id} className="border-b border-zinc-100 last:border-b-zinc-200">
                          <td className="py-3 pl-1 pr-1.5 font-medium">{description}</td>
                          <td className="px-1.5 py-3">{quantity}</td>
                          <td className="whitespace-nowrap px-1.5 py-3">{currency(unitPrice)}</td>
                          <td className="px-1.5 py-3">{unit}</td>
                          <td className="px-1.5 py-3">{taxRate} %</td>
                          <td className="whitespace-nowrap px-1.5 py-3 text-right font-semibold">
                            {currency(lineTotalHT)}
                          </td>
                          <td className="whitespace-nowrap py-3 pl-1.5 pr-1 text-right font-semibold">
                            {currency(lineTotalTTC)}
                          </td>
                        </tr>
                      )
                    })
                  : (
                      <tr className="h-11 border-b border-zinc-200">
                        <td colSpan={7} />
                      </tr>
                    )}
              </tbody>
            </table>
          </div>

          <div className="mt-6 flex justify-end">
            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-12 text-zinc-500">
                <p>Sous-total :</p>
                <p>{currency(totalHT)}</p>
              </div>

              <div className="flex items-center gap-12 text-zinc-500">
                <p>Total TVA :</p>
                <p>{currency(totalTVA)}</p>
              </div>

              <div className="flex items-center gap-12 font-semibold text-primary">
                <p>TOTAL TTC :</p>
                <p>{currency(totalTTC)}</p>
              </div>
            </div>
          </div>

          <footer className="mt-7 grid gap-6 border-t border-zinc-200 pt-5 md:grid-cols-[1.1fr,0.9fr]">
            <section>
              <div className="mb-3 flex items-center gap-2 font-title font-semibold">
                <Landmark className="h-4 w-4 text-primary" />
                <h2>Coordonnées bancaires</h2>
              </div>

              <div className="grid gap-x-8 gap-y-2 sm:grid-cols-2">
                <p className="flex justify-between gap-4">
                  <b>Titulaire : {companyName}</b>
                </p>
                <p className="flex justify-between gap-4">
                  <b>IBAN : {companyIban}</b>
                </p>
                <p className="flex justify-between gap-4">
                  <b>Banque : {companyName}</b>
                </p>
                <p className="flex justify-between gap-4">
                  <b>BIC : {companyBic}</b>
                </p>
              </div>
            </section>

            <section className="flex flex-col justify-between gap-6">
              <hr className="inline-block w-full text-primary" />
              <div className="text-right">
                <p className="text-[10px] text-zinc-500">Merci pour votre confiance.</p>
                <p>{isInvoice ? 'Facture' : 'Devis'} fait avec Onetto</p>
              </div>
            </section>
          </footer>
        </div>
      </article>
      
     
    </>
  )
}

function ServiceDetail({ label, value, align = 'left' }: {
  label: string
  value: string
  align?: 'left' | 'right'
}) {
  return (
    <div className={align === 'right' ? 'text-right' : undefined}>
      <p className="text-zinc-500">{label}</p>
      <p className="mt-0.5 font-semibold text-zinc-800">{value}</p>
    </div>
  )
}

export default DocumentDisplayComponent
