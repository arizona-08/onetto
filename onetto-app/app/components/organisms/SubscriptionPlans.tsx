'use client'

import Link from 'next/link'
import React from 'react'
import { Check, CreditCard, ExternalLink, Sparkles } from 'lucide-react'
import { cancelPendingPlanChange, getCheckoutSession, scheduleFreePlan } from '@/lib/subscription/subscription'
import { STRIPE_PRODUCTS } from '@/shared/constants'
import { formatCurrency } from '@/shared/utils'
import { useToast } from '../context/ToastContext'

type SubscriptionPlansProps = {
  currentPlan: string
  pendingPlan: string | null
  pendingPlanEffectiveAt: string | null
}

function getProductPlan(productName: string) {
  return productName.toUpperCase()
}

function formatSubscriptionPlan(plan: string) {
  const labels: Record<string, string> = {
    FREE: 'ABONNEMENT GRATUIT',
    STARTER_MONTHLY: 'ABONNEMENT STARTER MENSUEL',
    STARTER_YEARLY: 'ABONNEMENT STARTER ANNUEL',
    PRO_MONTHLY: 'ABONNEMENT PRO MENSUEL',
    PRO_YEARLY: 'ABONNEMENT PRO ANNUEL',
  }
  return labels[plan] ?? plan
}

function SubscriptionPlans({ currentPlan, pendingPlan, pendingPlanEffectiveAt }: SubscriptionPlansProps) {
  const { showToast } = useToast()

  async function purchaseSubscriptionPlan(
    event: React.MouseEvent<HTMLButtonElement>,
    planProductId: string,
  ) {
    event.preventDefault()
    try {
      const responseUrl = await getCheckoutSession(planProductId)
      if (!responseUrl.ok) {
        showToast('Une erreur est survenue lors de la création de la session de paiement.', 'error')
        return
      }
      if (responseUrl.data.url) {
        window.location.assign(responseUrl.data.url)
      } else {
        showToast(responseUrl.data.message ?? 'Votre changement de formule est en cours de confirmation.', 'success')
        window.location.reload()
      }
    } catch {
      showToast('Une erreur est survenue lors de la création de la session de paiement.', 'error')
    }
  }

  async function scheduleFree() {
    const response = await scheduleFreePlan()
    if (!response.ok) {
      showToast("Impossible de programmer le passage à l'offre gratuite.", 'error')
      return
    }
    window.location.reload()
  }

  async function keepCurrentPlan() {
    const response = await cancelPendingPlanChange()
    if (!response.ok) {
      showToast('Impossible d’annuler le changement programmé.', 'error')
      return
    }
    window.location.reload()
  }

  return (
    <>
      <section aria-labelledby="plans-heading">
        {pendingPlan && (
          <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950 sm:flex-row sm:items-center sm:justify-between">
            <p>Votre offre passera à <strong>{formatSubscriptionPlan(pendingPlan)}</strong>{pendingPlanEffectiveAt ? ` le ${new Intl.DateTimeFormat('fr-FR').format(new Date(pendingPlanEffectiveAt))}` : ' à la fin de la période en cours'}. Vous conservez votre abonnement actuel jusque-là.</p>
            <button type="button" onClick={() => void keepCurrentPlan()} className="shrink-0 rounded-xl border border-amber-400 bg-white px-4 py-2 font-semibold text-amber-900">Conserver {formatSubscriptionPlan(currentPlan)}</button>
          </div>
        )}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 id="plans-heading" className="font-title text-xl font-semibold text-zinc-900">Choisir la formule adaptée</h2>
            <p className="mt-1 text-sm text-zinc-600">Les fonctionnalités évoluent avec votre activité. Vous serez redirigé vers Stripe pour finaliser votre choix.</p>
          </div>
          <span className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-zinc-500"><CreditCard className="h-4 w-4" aria-hidden="true" /> Paiement sécurisé</span>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          {STRIPE_PRODUCTS.map((product) => {
            const productPlan = getProductPlan(product.name)
            const isCurrentPlan = currentPlan === productPlan || currentPlan.startsWith(`${productPlan}_`)
            const isRecommended = productPlan === 'PRO'
            const isFree = productPlan === 'FREE'

            return (
              <article key={product.id} className={`relative flex min-h-full flex-col rounded-2xl border bg-white p-5 ${isRecommended ? 'border-primary ring-1 ring-primary/15' : 'border-zinc-200'}`}>
                {isRecommended && <span className="absolute -top-3 left-5 inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-white"><Sparkles className="h-3.5 w-3.5" aria-hidden="true" /> Le plus complet</span>}
                <div>
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="font-title text-lg font-semibold text-zinc-900">{product.name}</h3>
                    {isCurrentPlan && <span className="shrink-0 whitespace-nowrap rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">Formule actuelle</span>}
                  </div>
                  <p className="mt-1 text-sm text-zinc-500">{isFree ? 'Pour démarrer simplement' : productPlan === 'STARTER' ? 'Pour automatiser votre suivi' : 'Pour piloter toute votre activité'}</p>
                </div>

                <div className="mt-6 border-y border-zinc-100 py-4">
                  <p className="font-title text-3xl font-semibold tracking-tight text-zinc-900">{formatCurrency(product.prices.monthlyPrice.priceInCents / 100)}<span className="ml-1 text-sm font-medium tracking-normal text-zinc-500">/ mois</span></p>
                  <p className="mt-1 text-sm text-zinc-500">ou {formatCurrency(product.prices.yearlyPrice.priceInCents / 100)} facturés annuellement</p>
                </div>

                <ul className="mt-5 space-y-3 text-sm text-zinc-700">
                  {product.features.map((feature) => <li key={feature} className="flex gap-2.5"><Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" /><span>{feature}</span></li>)}
                </ul>

                <div className="mt-auto flex w-full flex-col gap-2 pt-7">
                  {isFree ? (
                    isCurrentPlan ? <div className="flex min-h-11 w-full items-center justify-center rounded-xl border border-zinc-200 bg-zinc-50 px-4 text-sm font-semibold text-zinc-600">Formule actuelle</div> : <button type="button" onClick={() => void scheduleFree()} className="min-h-11 w-full rounded-xl border border-zinc-300 bg-white px-4 text-sm font-semibold text-zinc-800 transition hover:border-primary hover:text-primary">Passer à l’offre gratuite en fin de période</button>
                  ) : isCurrentPlan ? (
                    <div className="flex min-h-11 w-full items-center justify-center rounded-xl border border-primary/20 bg-primary/5 px-4 text-sm font-semibold text-primary">Votre formule actuelle</div>
                  ) : (
                    <>
                      <button onClick={(event) => purchaseSubscriptionPlan(event, product.prices.monthlyPrice.id)} className="min-h-11 w-full rounded-xl border border-zinc-300 bg-white px-4 text-sm font-semibold text-zinc-800 transition hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20">Choisir mensuel</button>
                      <button onClick={(event) => purchaseSubscriptionPlan(event, product.prices.yearlyPrice.id)} className="min-h-11 w-full rounded-xl bg-primary px-4 text-sm font-semibold text-white transition hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20">Choisir annuel</button>
                    </>
                  )}
                </div>
              </article>
            )
          })}
        </div>
      </section>

      <section className="flex flex-col gap-4 rounded-2xl border border-zinc-200 bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-title text-base font-semibold text-zinc-900">Gérer ma facturation</h2>
          <p className="mt-1 text-sm text-zinc-600">Retrouvez vos factures, votre moyen de paiement et les détails de votre abonnement.</p>
        </div>
        <Link href="https://billing.stripe.com/p/login/test_00w9AS62pdfn5WxbNg5EY00" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-zinc-300 bg-white px-4 text-sm font-semibold text-zinc-800 transition hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20">Ouvrir le portail Stripe <ExternalLink className="h-4 w-4" aria-hidden="true" /></Link>
      </section>
    </>
  )
}

export default SubscriptionPlans
