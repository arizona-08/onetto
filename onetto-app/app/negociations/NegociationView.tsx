'use client'

import { PublicNegociation } from '@/app/types'
import { apiClient } from '@/lib/api'
import { formatCurrency, formatDate } from '@/shared/utils'
import { CheckCircle2, CircleCheck, CircleX, FileText, MessageSquareText, Send } from 'lucide-react'
import { useState } from 'react'

type NegociationViewProps = { negociation: PublicNegociation; token: string }
type NegociationStatus = PublicNegociation['status']

export default function NegociationView({ negociation, token }: NegociationViewProps) {
  const [message, setMessage] = useState(negociation.message)
  const [status, setStatus] = useState<NegociationStatus>(negociation.status)
  const [showChanges, setShowChanges] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const { document } = negociation
  const { company } = document
  const isInvoice = document.type === 'INVOICE'
  const canNegotiate = negociation.canNegotiate

  async function setDecision(nextStatus: 'ACCEPTED' | 'REJECTED') {
    setIsSaving(true)
    setError('')
    const response = await apiClient<{ success: true }>(`api/negociations/${encodeURIComponent(token)}/status`, {
      method: 'PUT', body: JSON.stringify({ status: nextStatus }),
    })
    setIsSaving(false)
    if (!response.ok) { setError('Votre réponse n’a pas pu être enregistrée. Veuillez réessayer.'); return }
    setStatus(nextStatus)
  }

  async function submitChanges(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSaving(true)
    setError('')
    const response = await apiClient<{ success: true }>(`api/negociations/${encodeURIComponent(token)}/message`, {
      method: 'PUT', body: JSON.stringify({ message: message.trim() }),
    })
    setIsSaving(false)
    if (!response.ok) { setError('Votre demande n’a pas pu être enregistrée. Veuillez réessayer.'); return }
    setStatus('RENEGOCIATED')
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#e8e9ff_0,transparent_38%),#f9f9fb] px-4 py-8 text-secondary sm:px-6 lg:py-12">
      <div className="mx-auto max-w-5xl">
        <header className="mb-8 flex flex-col gap-5 rounded-2xl border border-white/70 bg-white/75 px-6 py-5 shadow-sm backdrop-blur sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-xl bg-primary text-white shadow-lg shadow-primary/20"><FileText className="h-5 w-5" /></div><div><p className="font-title text-lg font-extrabold tracking-tight">Onetto</p><p className="text-sm text-zinc-500">{isInvoice ? 'Votre facture finale' : 'Votre devis et son espace d’échange'}</p></div></div>
          <span className="w-fit rounded-full bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary">{isInvoice ? 'Facture' : 'Devis'} {document.documentNumber}</span>
        </header>
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
          <article className="overflow-hidden rounded-2xl bg-white shadow-[0_24px_70px_-45px_rgba(15,23,42,0.45)]">
            <div className="border-b border-zinc-100 bg-primary/[0.03] px-6 py-7 sm:px-9"><div className="flex items-start justify-between gap-6"><div><p className="font-title text-5xl font-medium uppercase tracking-tighter text-primary sm:text-6xl">{isInvoice ? 'Facture' : 'Devis'}</p><p className="mt-2 text-sm font-semibold text-zinc-500">n° {document.documentNumber}</p></div><div className="h-14 w-14 rounded-xl bg-primary shadow-lg shadow-primary/20" /></div><div className="mt-7 grid gap-3 text-sm text-zinc-600 sm:grid-cols-2"><p><span className="font-semibold text-zinc-900">Émis le </span>{formatDate(isInvoice ? (document.sentAt ?? document.createdAt) : document.createdAt)}</p><p><span className="font-semibold text-zinc-900">{isInvoice ? 'Date d’échéance ' : 'Valable jusqu’au '}</span>{formatDate(document.paymentDueAt)}</p></div></div>
            <div className="px-6 py-7 sm:px-9"><div className="grid gap-8 border-b border-zinc-100 pb-7 text-sm sm:grid-cols-2"><section><p className="mb-2 text-xs font-bold uppercase tracking-wider text-zinc-400">Proposé par</p><p className="font-title text-lg font-extrabold">{company.name}</p><p>{company.address}</p><p>{company.postalCode} {company.city}, {company.country}</p><p className="mt-2 text-zinc-500">SIREN : {company.siren}</p>{company.subjectToVat && company.vatNumber && <p className="text-zinc-500">TVA : {company.vatNumber}</p>}<p className="text-zinc-500">{company.email} · {company.phoneNumber}</p></section><section className="sm:text-right"><p className="mb-2 text-xs font-bold uppercase tracking-wider text-zinc-400">À l’attention de</p><p className="font-title text-lg font-extrabold">{document.clientName}</p><p>{document.clientEmail}</p><p className="mt-2">{document.clientAddress}</p><p>{document.clientPostalCode} {document.clientCity}, {document.clientCountry}</p></section></div><div className="mt-7 overflow-x-auto"><table className="w-full min-w-[590px] text-left text-sm"><thead className="bg-primary/10 text-xs uppercase tracking-wide text-zinc-600"><tr><th className="rounded-l-lg px-3 py-3">Description</th><th className="px-3 py-3">Qté</th><th className="px-3 py-3">Prix HT</th><th className="px-3 py-3">TVA</th><th className="rounded-r-lg px-3 py-3 text-right">Total TTC</th></tr></thead><tbody>{document.services.map((service) => <tr key={service.id} className="border-b border-zinc-100"><td className="px-3 py-4 font-medium">{service.description}</td><td className="px-3 py-4">{service.quantity} {service.unit}</td><td className="px-3 py-4">{formatCurrency(service.unitPrice)}</td><td className="px-3 py-4">{service.taxRate ?? 0} %</td><td className="px-3 py-4 text-right font-semibold">{formatCurrency(service.totalPrice)}</td></tr>)}</tbody></table></div><div className="ml-auto mt-7 w-full max-w-xs space-y-2 rounded-xl bg-zinc-50 p-4 text-sm"><div className="flex justify-between text-zinc-500"><span>Sous-total</span><span>{formatCurrency(document.totalPriceExcludingTax)}</span></div><div className="flex justify-between text-zinc-500"><span>TVA</span><span>{formatCurrency(document.totalPrice - document.totalPriceExcludingTax)}</span></div><div className="flex justify-between border-t border-zinc-200 pt-3 font-bold text-primary"><span>Total TTC</span><span>{formatCurrency(document.totalPrice)}</span></div></div></div>
          </article>
          {!isInvoice && <aside className="rounded-2xl border border-primary/10 bg-white p-5 shadow-sm lg:sticky lg:top-8"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><MessageSquareText className="h-5 w-5" /></div>{status === 'PENDING' && !showChanges && <><h1 className="mt-4 font-title text-xl font-extrabold">Votre décision</h1><p className="mt-2 text-sm leading-6 text-zinc-500">{canNegotiate ? 'Vous pouvez accepter ce devis, demander des ajustements ou le refuser.' : 'Vous pouvez accepter ou refuser ce devis.'}</p><div className="mt-5 space-y-2"><button onClick={() => setDecision('ACCEPTED')} disabled={isSaving} className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-white disabled:opacity-50"><CircleCheck className="h-4 w-4" />Accepter le devis</button>{canNegotiate ? <button onClick={() => setShowChanges(true)} disabled={isSaving} className="w-full rounded-xl border border-primary px-4 py-3 text-sm font-bold text-primary">Demander des changements</button> : <div title="Passer au plan STARTER pour activer cette fonctionnalité" className="cursor-not-allowed opacity-50"><button type="button" disabled className="w-full rounded-xl border border-primary px-4 py-3 text-sm font-bold text-primary">Demander des changements</button><p className="mt-2 rounded-xl border border-dashed border-zinc-300 bg-zinc-50 px-3 py-2 text-xs text-zinc-500">Passer au plan STARTER pour activer la négociation.</p></div>}<button onClick={() => setDecision('REJECTED')} disabled={isSaving} className="flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-zinc-500 hover:bg-zinc-50"><CircleX className="h-4 w-4" />Refuser le devis</button></div></>}{status === 'PENDING' && showChanges && <form className="mt-4" onSubmit={submitChanges}><h1 className="mt-4 font-title text-xl font-extrabold">Quels changements ?</h1><p className="mt-2 text-sm leading-6 text-zinc-500">Décrivez les ajustements souhaités sur ce devis.</p><textarea value={message} onChange={(event) => setMessage(event.target.value)} maxLength={5000} rows={9} placeholder="Par exemple : ajouter, modifier ou supprimer une prestation ; ajuster une quantité ; demander une remise sur une ligne ou sur le total du devis ; poser une question…" className="mt-4 w-full resize-y rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-3 text-sm leading-6 outline-none transition placeholder:text-zinc-400 focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/10" />{error && <p className="mt-2 text-sm text-red-600">{error}</p>}<button type="submit" disabled={isSaving || !message.trim()} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-white disabled:opacity-50"><Send className="h-4 w-4" />{isSaving ? 'Enregistrement…' : 'Valider mes changements'}</button><button type="button" onClick={() => setShowChanges(false)} className="mt-3 w-full text-sm font-medium text-zinc-500">Retour</button></form>}{status === 'ACCEPTED' && <DecisionResult icon={<CircleCheck className="h-6 w-6" />} title="Devis accepté" text="Votre acceptation a bien été enregistrée." tone="text-emerald-600" />}{status === 'RENEGOCIATED' && <DecisionResult icon={<CheckCircle2 className="h-6 w-6" />} title="Changements demandés" text="Votre demande a bien été transmise avec le devis." tone="text-primary" />}{status === 'REJECTED' && <DecisionResult icon={<CircleX className="h-6 w-6" />} title="Devis refusé" text="Votre décision a bien été enregistrée." tone="text-zinc-500" />}</aside>}
        </div>
      </div>
    </main>
  )
}

function DecisionResult({ icon, title, text, tone }: { icon: React.ReactNode; title: string; text: string; tone: string }) {
  return <div className="mt-4"><div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-100 ${tone}`}>{icon}</div><h1 className="mt-4 font-title text-xl font-extrabold">{title}</h1><p className="mt-2 text-sm leading-6 text-zinc-500">{text}</p></div>
}
