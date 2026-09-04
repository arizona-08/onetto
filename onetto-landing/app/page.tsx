export default function Home() {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <div className="relative overflow-hidden">
        <div className="pointer-events-none absolute -top-32 -right-32 h-105 w-105 rounded-full bg-[#454ADE]/15 blur-3xl" />
        <div className="pointer-events-none absolute -left-32 top-48 h-70 w-70 rounded-full bg-emerald-200/50 blur-3xl" />
        <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-8 sm:px-10">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#454ADE] text-white shadow-lg shadow-[#454ADE]/30">
              O
            </div>
            <span className="text-lg font-semibold tracking-wide">ONETTO</span>
          </div>
          <nav className="hidden items-center gap-8 text-sm font-medium text-slate-600 md:flex">
            <a className="transition-colors hover:text-slate-900" href="#features">
              Fonctionnalites
            </a>
            <a className="transition-colors hover:text-slate-900" href="#pricing">
              Tarification
            </a>
            <a className="transition-colors hover:text-slate-900" href="#security">
              Securite
            </a>
            <a className="transition-colors hover:text-slate-900" href="#faq">
              FAQ
            </a>
          </nav>
          <div className="flex items-center gap-3">
            <button className="hidden rounded-full px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:text-slate-900 md:inline-flex">
              Se connecter
            </button>
            <button className="rounded-full bg-[#454ADE] px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-[#454ADE]/30 transition-transform hover:-translate-y-0.5">
              S’inscrire gratuitement
            </button>
          </div>
        </header>

        <main className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-12 px-6 pb-24 pt-6 sm:px-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div className="space-y-8">
            <span className="inline-flex items-center gap-2 rounded-full border border-[#454ADE]/20 bg-[#454ADE]/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-[#454ADE]">
              Facturation et encaissement
            </span>
            <div className="space-y-4">
              <h1 className="text-4xl font-bold leading-tight text-slate-900 sm:text-5xl">
                Encaissez plus vite.
                <span className="block text-[#454ADE]">Gardez votre CA.</span>
              </h1>
              <p className="max-w-xl text-lg leading-8 text-slate-600">
                ONETTO cree vos factures, genere un lien de paiement pour vos clients et
                vous aide à suivre vos encaissements. <span className="font-semibold textGradient">Aucune commission Onetto sur vos factures payées.</span>
              </p>
              <p className="max-w-xl text-base leading-7 text-slate-500">
                
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <button className="rounded-full bg-[#454ADE] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-[#454ADE]/30 transition-transform hover:-translate-y-0.5">
                Rejoindre la liste d’attente
              </button>
              <button className="rounded-full border border-slate-200 px-6 py-3 text-sm font-semibold text-slate-700 transition-colors hover:border-slate-300 hover:text-slate-900">
                Voir comment ca marche
              </button>
            </div>
            <div className="flex flex-wrap gap-6 text-sm text-slate-500">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">99%</span>
                <div>
                  <p className="font-semibold text-slate-800">Paiements instantanes</p>
                  <p>Suivi en temps reel</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-100 text-[#454ADE]">0 €</span>
                <div>
                  <p className="font-semibold text-slate-800">Sans commission Onetto</p>
                  <p>Frais selon votre offre GoCardless</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-700">24/7</span>
                <div>
                  <p className="font-semibold text-slate-800">Support humain</p>
                  <p>Reponse rapide</p>
                </div>
              </div>
            </div>
          </div>

          <div className="relative">
            <div className="absolute -right-6 top-8 hidden h-24 w-24 rounded-3xl bg-[#454ADE]/15 lg:block" />
            <div className="relative mx-auto w-full max-w-md rounded-[32px] bg-white p-6 shadow-2xl shadow-[#454ADE]/15">
              <div className="rounded-[26px] border border-slate-100 bg-slate-50 p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Solde total</p>
                    <p className="text-3xl font-semibold text-slate-900">12 650,75 €</p>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#454ADE] text-white">
                    €
                  </div>
                </div>
                <div className="mt-6 flex items-end justify-between rounded-2xl bg-white p-4">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Revenus ce mois</p>
                    <p className="text-2xl font-semibold text-emerald-500">+18%</p>
                  </div>
                  <div className="flex h-12 w-24 items-end gap-2">
                    <span className="h-6 w-3 rounded-full bg-emerald-200" />
                    <span className="h-10 w-3 rounded-full bg-[#454ADE]/60" />
                    <span className="h-8 w-3 rounded-full bg-emerald-300" />
                    <span className="h-12 w-3 rounded-full bg-[#454ADE]" />
                  </div>
                </div>
                <div className="mt-6 space-y-3">
                  <div className="flex items-center justify-between rounded-2xl bg-white px-4 py-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Facture #238</p>
                      <p className="text-xs text-slate-500">Lien envoye il y a 2 h</p>
                    </div>
                    <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-600">
                      Payee
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded-2xl bg-white px-4 py-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Facture #239</p>
                      <p className="text-xs text-slate-500">En attente de paiement</p>
                    </div>
                    <span className="rounded-full bg-[#454ADE]/10 px-3 py-1 text-xs font-semibold text-[#454ADE]">
                      Relancer
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="absolute -bottom-6 left-6 hidden w-48 rounded-2xl border border-slate-100 bg-white p-4 shadow-xl shadow-[#454ADE]/10 lg:block">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Objectif</p>
              <p className="text-sm font-semibold text-slate-900">CA mensuel</p>
              <div className="mt-3 flex items-center justify-between text-sm">
                <span className="font-semibold text-[#454ADE]">8 200 €</span>
                <span className="text-slate-500">/ 10 000 €</span>
              </div>
              <div className="mt-3 h-2 w-full rounded-full bg-slate-100">
                <div className="h-2 w-3/4 rounded-full bg-[#454ADE]" />
              </div>
            </div>
          </div>
        </main>
      </div>

      <section id="features" className="mx-auto w-full max-w-6xl px-6 pb-20 sm:px-10">
        <div className="grid gap-6 rounded-[32px] border border-slate-100 bg-slate-50 p-8 md:grid-cols-3">
          <div className="space-y-3">
            <p className="text-sm font-semibold text-[#454ADE]">Factures pro</p>
            <p className="text-lg font-semibold text-slate-900">
              Modeles elegants, numerotation automatique, mentions legales.
            </p>
          </div>
          <div className="space-y-3">
            <p className="text-sm font-semibold text-[#454ADE]">Lien de paiement</p>
            <p className="text-lg font-semibold text-slate-900">
              Envoyez un lien, encaissez par carte ou virement, suivez tout.
            </p>
          </div>
          <div className="space-y-3">
            <p className="text-sm font-semibold text-[#454ADE]">Paiements flexibles</p>
            <p className="text-lg font-semibold text-slate-900">
              Créez des liens de paiement et suivez vos encaissements simplement.
            </p>
          </div>
        </div>
      </section>

      <section id="pricing" className="mx-auto w-full max-w-6xl px-6 pb-24 sm:px-10">
        <div className="grid gap-8 rounded-[36px] bg-[#454ADE] px-8 py-12 text-white md:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-4">
            <p className="text-xs uppercase tracking-[0.2em] text-white/70">Paiements transparents</p>
            <h2 className="text-3xl font-semibold">Des frais définis avec votre prestataire.</h2>
            <p className="text-white/80">
              ONETTO ne prélève pas de commission sur vos factures payées. Les frais
              liés aux liens de paiement sont ceux prévus par votre offre GoCardless.
            </p>
          </div>
          <div className="rounded-3xl bg-white/10 p-6">
            <div className="flex items-center justify-between">
              <p className="text-sm text-white/70">Frais de paiement</p>
              <p className="text-3xl font-semibold">GoCardless</p>
            </div>
            <p className="mt-4 text-sm text-white/70">
              Le montant dépend de l’offre souscrite auprès de votre prestataire.
            </p>
            <button className="mt-6 w-full rounded-full bg-white px-4 py-3 text-sm font-semibold text-[#454ADE]">
              Demarrer avec ONETTO
            </button>
          </div>
        </div>
      </section>

      <section id="security" className="mx-auto w-full max-w-6xl px-6 pb-24 sm:px-10">
        <div className="grid gap-10 md:grid-cols-2">
          <div className="space-y-4">
            <p className="text-sm font-semibold text-[#454ADE]">Securite & confiance</p>
            <h3 className="text-2xl font-semibold text-slate-900">
              Vos paiements et vos donnees sont proteges.
            </h3>
            <p className="text-slate-600">
              Paiements conformes, liens chiffrés et historique clair pour vos clients.
              Vous etes informe a chaque etape.
            </p>
          </div>
          <div className="grid gap-4 rounded-3xl border border-slate-100 bg-white p-6 shadow-lg shadow-[#454ADE]/10">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">Alertes instantanees</p>
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-600">
                Actif
              </span>
            </div>
            <p className="text-sm text-slate-500">
              Notification a chaque paiement et relance intelligente.
            </p>
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">Historique complet</p>
              <span className="text-sm font-semibold text-[#454ADE]">100%</span>
            </div>
            <p className="text-sm text-slate-500">
              Acces instantane aux factures, liens et preuves de paiement.
            </p>
          </div>
        </div>
      </section>

      <section id="faq" className="mx-auto w-full max-w-6xl px-6 pb-24 sm:px-10">
        <div className="rounded-[28px] border border-slate-100 bg-slate-50 p-8">
          <div className="grid gap-6 md:grid-cols-3">
            <div>
              <p className="text-sm font-semibold text-[#454ADE]">Questions</p>
              <h3 className="text-2xl font-semibold text-slate-900">
                Tout savoir sur ONETTO
              </h3>
            </div>
            <div className="space-y-4 text-sm text-slate-600 md:col-span-2">
              <div>
                <p className="font-semibold text-slate-900">Qui peut utiliser ONETTO ?</p>
                <p>Independants, freelances et entreprises qui emettent des factures.</p>
              </div>
              <div>
                <p className="font-semibold text-slate-900">Mes clients ont-ils un compte ?</p>
                <p>Non, ils paient via un lien securise, en quelques secondes.</p>
              </div>
              <div>
                <p className="font-semibold text-slate-900">Pourquoi 1 EUR ?</p>
                <p>
                  Vous gardez 100% de votre CA, sans surprise ni pourcentage.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
