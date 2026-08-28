export type StripeProduct = {
  id: string,
  name: string,
  prices: {
    monthlyPrice: {
      id: string,
      priceInCents: number
    }
    yearlyPrice: {
      id: string,
      priceInCents: number
    }
  },
  features: string[]
}

export const STRIPE_PRODUCTS: StripeProduct[] = [
  {
    id: 'free',
    name: 'Free',
    prices: {
      monthlyPrice: {
        id: 'free-monthly',
        priceInCents: 0
      },
      yearlyPrice: {
        id: 'free-yearly',
        priceInCents: 0
      }
    },
    features: [
      "1 entreprise",
      "Devis et factures illimités",
      "Paiement sécurisé et suivi des documents"
    ]
  },
  {
    id: 'prod_V8LpPUzdMXdDx8',
    name: 'Starter',
    prices: {
      monthlyPrice: {
        id: 'price_1U83OWBmGe1i60kJgTH8iJSF',
        priceInCents: 700
      },
      yearlyPrice: {
        id: 'price_1U85hBBmGe1i60kJD5Ge9stG',
        priceInCents: 8400
      }
    },
    features: [
      "Tout le plan Free",
      "Négociation de devis avec vos clients",
      "Relances automatiques"
    ]
  },
  {
    id: 'prod_V8K2TzuzGlFl8h',
    name: 'Pro',
    prices: {
      monthlyPrice: {
        id: 'price_1U857TBmGe1i60kJsLqldLwQ',
        priceInCents: 1300
      },
      yearlyPrice: {
        id: 'price_1U85i8BmGe1i60kJ7vgoUvqb',
        priceInCents: 15600
      }
    },
    features: [
      "Tout le plan Starter",
      "Paiement en 2 ou 3 fois",
      "Jusqu’à 3 entreprises",
      "Analyses avancées et prévisions d’encaissement"
    ]
  }
]
