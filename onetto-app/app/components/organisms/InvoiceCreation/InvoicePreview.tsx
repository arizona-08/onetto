'use client'

import { Client, ServiceLineItem } from '@/app/types'
import { formatDate } from '@/shared/utils'
import { CreditCard, Landmark } from 'lucide-react'
import React from 'react'
import { useAuthUser } from '../../context/AuthUserContext'

interface InvoicePreviewProps {
  client: Client | null
  lineItems: ServiceLineItem[]
  invoiceDates: { creationDate: string; dueDate: string }
}

const currency = (amount: number) => amount.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })

function InvoicePreview({ client, lineItems, invoiceDates }: InvoicePreviewProps) {
  const { user } = useAuthUser()
  const contactName = `${user?.firstname ?? ''} ${user?.lastname ?? ''}`.trim()
  const contactEmail = user?.email ?? ''
  const totalHT = lineItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)
  const totalTVA = lineItems.reduce((sum, item) => sum + item.unitPrice * item.quantity * item.taxRate / 100, 0)
  const totalTTC = totalHT + totalTVA

  return (
    <div className="mt-10">
      <div className="mb-4 flex w-fit items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm text-primary">
        <span className="h-2 w-2 animate-pulse rounded-full bg-primary" />
        <span>Aperçu de la facture</span>
      </div>

      <article className="mx-auto w-full max-w-[210mm] overflow-hidden rounded-md bg-white text-[11px] leading-relaxed text-zinc-950 shadow-[0_24px_70px_-45px_rgba(15,23,42,0.45)]">
        <header className="bg-zinc-50 px-7 py-6">
          <div className="flex items-start justify-between gap-6">
            <div>
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-md bg-primary font-title text-sm font-black text-white">ON</div>
                <div><p className="min-h-5 font-title text-xl font-black text-primary"/><p className="font-semibold uppercase text-zinc-500">Facturation professionnelle</p></div>
              </div>
              <div className="text-zinc-700">
                <p className="font-semibold text-zinc-950">{contactName}</p><p>E-mail : {contactEmail}</p>
                <p className="min-h-4"/><p className="min-h-4"/><p className="min-h-4"/>
                <p>SIREN :</p><p>SIRET :</p><p>RCS :</p><p>TVA intracommunautaire :</p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-title text-3xl font-black text-primary">Facture</p>
              <div className="mt-5 space-y-2">
                <div><p className="font-semibold text-zinc-500">Numéro de facture</p><p className="font-title text-xl font-black">FACT-XXXX</p></div>
                <div><p className="font-semibold text-zinc-500">Date d&apos;émission</p><p>{formatDate(invoiceDates.creationDate)}</p></div>
                <div><p className="font-semibold text-zinc-500">Date d&apos;échéance</p><p>{formatDate(invoiceDates.dueDate)}</p></div>
                <div><p className="font-semibold text-zinc-500">Statut</p><p className="min-h-4 font-semibold text-primary"/></div>
                <p>Réf. devis :</p><p>Réf. commande :</p>
              </div>
            </div>
          </div>
          <div className="mt-7 grid gap-6 md:grid-cols-2">
            <section className="rounded-md bg-primary/20 p-3"><p className="mb-2 font-bold uppercase text-zinc-500">Émetteur</p><div className="space-y-0.5"><p className="min-h-5 font-title text-lg font-black"/><p>{contactName}</p><p>{contactEmail}</p><p className="min-h-4"/><p className="min-h-4"/></div></section>
            <section className="rounded-md bg-primary/20 p-3"><p className="mb-2 font-bold uppercase text-zinc-500">Destinataire</p><div className="space-y-0.5"><p className="min-h-5 font-title text-lg font-black">{client?.name ?? ''}</p><p>{client?.email ?? ''}</p><p>{client?.street ?? ''}</p><p>{[client?.postalCode, client?.city, client?.country].filter(Boolean).join(' ')}</p><p>TVA intracommunautaire :</p></div></section>
          </div>
        </header>

        <div className="px-7 py-6">
          <div className="overflow-x-auto"><table className="w-full min-w-[720px] border-collapse text-left text-[10px]">
            <thead><tr className="border-b border-zinc-200 font-bold uppercase text-zinc-600"><th className="py-2.5 pr-3">Description</th><th className="px-3 py-2.5">Qté</th><th className="px-3 py-2.5">Prix HT</th><th className="px-3 py-2.5">Unité</th><th className="px-3 py-2.5">TVA</th><th className="px-3 py-2.5 text-right">Total HT</th><th className="py-2.5 pl-3 text-right">Total TTC</th></tr></thead>
            <tbody>{lineItems.length > 0 ? lineItems.map((item, index) => { const ht = item.quantity * item.unitPrice; const ttc = ht * (1 + item.taxRate / 100); return <tr key={index} className="border-b border-zinc-100 last:border-b-zinc-200"><td className="py-3 pr-3 font-medium">{item.description}</td><td className="px-3 py-3">{item.quantity}</td><td className="px-3 py-3">{currency(item.unitPrice)}</td><td className="px-3 py-3">{item.unit}</td><td className="px-3 py-3">{item.taxRate} %</td><td className="px-3 py-3 text-right font-semibold">{currency(ht)}</td><td className="py-3 pl-3 text-right font-semibold">{currency(ttc)}</td></tr> }) : <tr className="h-11 border-b border-zinc-200"><td colSpan={7}/></tr>}</tbody>
          </table></div>

          <div className="mt-6 grid gap-6 lg:grid-cols-[1.15fr,0.85fr]">
            <div className="space-y-4">
              <section className="border-l-3 border-primary pl-4"><div className="mb-2 flex items-center gap-2 font-title font-black"><CreditCard className="h-4 w-4 text-primary"/><h2>Conditions de paiement</h2></div><div className="space-y-0.5 text-zinc-700"><p><b className="text-zinc-950">Date d&apos;échéance :</b> {invoiceDates.dueDate ? formatDate(invoiceDates.dueDate) : ''}</p><p><b className="text-zinc-950">Moyen de paiement accepté :</b></p><p><b className="text-zinc-950">Escompte pour paiement anticipé :</b></p></div></section>
              <section className="border-l-3 border-primary pl-4"><div className="mb-2 flex items-center gap-2 font-title font-black"><CreditCard className="h-4 w-4 text-primary"/><h2>Pénalités de retard</h2></div><div className="space-y-0.5 text-zinc-700"><p>Tout retard de paiement entraînera l&apos;application de pénalités au taux de 10 % par an.</p><p>Indemnité forfaitaire pour frais de recouvrement : 40 €.</p><p>Référence : article L.441-10 du Code de commerce.</p></div></section>
            </div>
            <aside className="self-start border border-zinc-200 p-4"><div className="flex justify-between gap-8"><span>Total HT</span><b>{currency(totalHT)}</b></div><div className="mt-2 flex justify-between gap-8"><span>TVA</span><b>{currency(totalTVA)}</b></div><div className="my-3 h-px bg-zinc-200"/><div className="flex justify-between gap-8"><b className="font-title text-sm">Total TTC</b><b className="font-title text-xl text-primary">{currency(totalTTC)}</b></div><div className="mt-4 flex justify-between gap-8 border-t border-zinc-200 pt-3"><b>Solde dû</b><b className="font-title text-lg text-primary">{currency(totalTTC)}</b></div></aside>
          </div>

          <footer className="mt-7 grid gap-6 border-t border-zinc-200 pt-5 md:grid-cols-[1.1fr,0.9fr]">
            <section><div className="mb-3 flex items-center gap-2 font-title font-black"><Landmark className="h-4 w-4 text-primary"/><h2>Coordonnées bancaires</h2></div><div className="grid gap-x-8 gap-y-2 sm:grid-cols-2"><p className="flex justify-between gap-4"><b>Titulaire</b><span/></p><p className="flex justify-between gap-4"><b>IBAN</b><span/></p><p className="flex justify-between gap-4"><b>Banque</b><span/></p><p className="flex justify-between gap-4"><b>BIC</b><span/></p></div></section>
            <section className="flex flex-col justify-between gap-6"><div><p className="font-semibold">Facture émise par {contactName}</p><div className="mt-8 h-px bg-zinc-200"/></div><div><p className="text-[10px] text-zinc-500">Merci pour votre confiance.</p><p>Facture faite avec Onetto</p></div></section>
          </footer>
        </div>
      </article>
    </div>
  )
}

export default InvoicePreview
