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
      "Génération de factures illimitée",
      "Transformation de devis en devis en factures",
      "Négociation de devis avec vos clients"
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
      "Génération de factures illimitée",
      "Transformation de devis en devis en factures",
      "Négociation de devis avec vos clients"
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
      "Toutes les fonctionnalités du plan Starter",
      "Gestion multi-utilisateurs",
      "Gestion multi-entreprises",
      "Support prioritaire"
    ]
  }
]