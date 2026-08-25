'use client'
import { getCheckoutSession } from '@/lib/subscription/subscription'
import { STRIPE_PRODUCTS } from '@/shared/constants'
import { formatCurrency } from '@/shared/utils'
import React from 'react'
import { useToast } from '../context/ToastContext'
import Link from 'next/link'

function SubscriptionPlans() {
  const { showToast } = useToast();

  async function purchaseSubscriptionPlan(planProductId: string){
    try {
      const responseUrl = await getCheckoutSession(planProductId);
      if(!responseUrl.ok){
        showToast("Une erreur est survenue lors de la création de la session de checkout.", "error");
        return;
      }
      window.location.assign(responseUrl.data.url);
    } catch (error) {
      showToast("Une erreur est survenue lors de la création de la session de checkout.", "error");
    }
  }

  return (
    <>
    <section>
      <h2>Les différents abonnements:</h2>

      <ul>
        {STRIPE_PRODUCTS.map((product) => (
        <li key={product.id} className="mb-4">
          <div className="bg-white p-4">
            <h4>{product.name}</h4>
            <p>{formatCurrency(product.prices.monthlyPrice.priceInCents / 100)}/mois</p>
            <p className="text-xs">{formatCurrency(product.prices.yearlyPrice.priceInCents / 100)}/an</p>
            <div className="flex gap-2 items-center mt-4">
              <button
                onClick={() => purchaseSubscriptionPlan(product.prices.monthlyPrice.id)}
                className="px-4 py-2 bg-white text-primary border border-primary rounded-lg cursor-pointer"
              >
                Choisir Mensuel
              </button>
              <button
                onClick={() => purchaseSubscriptionPlan(product.prices.yearlyPrice.id)}
                className="px-4 py-2 bg-primary text-white rounded-lg cursor-pointer"
              >
                Choisir Annuel
              </button>
            </div>
          </div>
        </li>
        ))}
      </ul>
    </section>

    <section>
      <Link href="https://billing.stripe.com/p/login/test_00w9AS62pdfn5WxbNg5EY00" className="inline-block bg-white border border-primary p-4">Gérer mon abonnement</Link>
    </section>
    </>
  )
}

export default SubscriptionPlans