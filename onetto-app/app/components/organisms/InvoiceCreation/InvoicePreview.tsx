import React from 'react'

function InvoicePreview() {
  return (
    <div className="w-full max-w-175 mt-10 lg:mt-0 rounded-2xl border border-gray-200 bg-linear-to-br from-white via-white to-gray-50/70 p-6 shadow-[0_10px_30px_-20px_rgba(15,23,42,0.35)]">
      <div className="flex items-center gap-2 w-fit text-sm bg-primary/10 text-primary px-3 py-1 rounded-full mb-4">
        <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
        <span>Aperçu de la facture</span>
      </div>
      {/* header de la facture */}
      <header className="flex flex-col gap-4 border-b border-gray-200 pb-5 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-primary text-white flex items-center justify-center font-title font-semibold tracking-wide">
            ON
          </div>
          <div>
            <h2 className="font-title text-2xl font-semibold tracking-tight">ONETTO</h2>
            <p className="text-primary/70 text-xs uppercase tracking-[0.18em]">Outil de facturation</p>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-right shadow-sm">
          <span className="text-xs font-semibold text-primary/70 uppercase tracking-[0.2em]">Numero de facture</span>
          <p className="font-semibold text-lg">#FACT-2026-0701</p>
        </div>
      </header>

      {/* Corps de la facture */}
      <div className="mt-6 grid gap-6 md:grid-cols-[1.3fr,1fr]">
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <span className="text-xs font-semibold text-primary/70 uppercase tracking-[0.2em]">A destination de</span>
          <p className="mt-2 text-lg font-semibold">Client Name</p>

          <p className="text-xs text-primary/80">10 rue de la Paix,</p>
          <p className="text-xs text-primary/80">75002, Paris</p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="mb-4">
            <span className="text-xs font-semibold text-primary/70 uppercase tracking-[0.2em]">Date de creation</span>
            <p className="mt-1 font-semibold">01 Jui. 2026</p>
          </div>

          <div>
            <span className="text-xs font-semibold text-primary/70 uppercase tracking-[0.2em]">Date d'echeance</span>
            <p className="mt-1 font-semibold">15 Jui. 2026</p>
          </div>
        </div>
      </div>

      {/* Détails de la facture */}
      <div className="mt-6 w-full overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="min-w-185 w-full text-left border-collapse">
          <thead className="border-b border-gray-200 bg-gray-50/70 text-xs uppercase tracking-[0.18em] text-gray-500">
            <tr>
              <th className="px-4 py-3 font-semibold">Description</th>
              <th className="px-4 py-3 font-semibold">Quantite</th>
              <th className="px-4 py-3 font-semibold">Prix unitaire</th>
              <th className="px-4 py-3 font-semibold text-right">Total</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            <tr className="border-b border-gray-200 last:border-b-0">
              <td className="px-4 py-4 font-medium">Developpement site vitrine</td>
              <td className="px-4 py-4">1</td>
              <td className="px-4 py-4">1000€ / site</td>
              <td className="px-4 py-4 text-right font-semibold">1000€</td>
            </tr>
            <tr className="border-b border-gray-200 last:border-b-0 bg-gray-50/40">
              <td className="px-4 py-4 font-medium">Developpement SaaS personnalise</td>
              <td className="px-4 py-4">1</td>
              <td className="px-4 py-4">5000€ / site</td>
              <td className="px-4 py-4 text-right font-semibold">5000€</td>
            </tr>
            <tr className="border-b border-gray-200 last:border-b-0">
              <td className="px-4 py-4 font-medium">Maintenance mensuelle</td>
              <td className="px-4 py-4">1</td>
              <td className="px-4 py-4">5€ / site</td>
              <td className="px-4 py-4 text-right font-semibold">5€</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Total de la facture */}
      <div className="mt-6 flex flex-col items-end gap-4">
        <div className="w-full max-w-90 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex justify-between text-sm text-gray-600">
            <span>Total HT</span>
            <p className="font-semibold text-primary">6005€</p>
          </div>

          <div className="mt-2 flex justify-between text-sm text-gray-600">
            <span>TVA (20%)</span>
            <p className="font-semibold text-primary">1201€</p>
          </div>

          <div className="my-3 h-px w-full bg-gray-200" />

          <div className="flex justify-between">
            <span className="text-sm font-semibold text-gray-700">Total TTC</span>
            <p className="text-2xl font-bold text-primary">7206€</p>
          </div>
        </div>
      </div>

      {/* Pied de page */}
      <footer className="mt-10 text-center text-xs uppercase tracking-[0.18em] text-gray-400">
        <p>Merci pour votre confiance !</p>
        <p>ONETTO - Outil de facturation</p>
      </footer>
    </div>
  )
}

export default InvoicePreview