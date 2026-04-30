
import InvoiceTable from '@/app/components/organisms/InvoiceTable'
import { AlertTriangle } from 'lucide-react'
import { ChartLine } from 'lucide-react'
import { Check } from 'lucide-react'
import { CirclePlusIcon } from 'lucide-react'
import React from 'react'

function Dashboard() {
  return (
    <div className="w-full">
      <div>
        <span className="text-xs text-zinc-500">MON CHIFFRE D'AFFAIRES</span>
        <h1 className="text-5xl font-title font-black text-zinc-700">€12,345.67</h1>

        <div className="flex items-center gap-4 mt-2">
          {/* progress bar */}
          <div className="relative h-2 w-90 bg-white rounded-full">
            <div className="absolute top-0 left-0 h-full w-3/4 bg-green-500 rounded-full"></div>
          </div>

          <p className="text-sm text-gray-500">75% de votre objectif de 25,000€</p>
        </div>
      </div>

      <div className="mt-8 w-full overflow-x-auto pb-4">
        <div className="flex items-center gap-3 flex-nowrap min-w-max">
          <div className="min-w-45 flex flex-col items-start gap-2 p-8 bg-green-100 rounded-lg ">
            <div className="flex items-center gap-1">
              <Check className="w-4 h-4 text-green-800" />
              <span className="text-xs uppercase text-gray-500">Payées</span>
            </div>
            <p className="text-3xl text-zinc-700 font-bold font-title">500€ </p>
            <p className="text-sm text-zinc-500">(5 factures payées)</p>
          </div>

          <div className="min-w-45 flex flex-col items-start gap-2 p-8 bg-orange-100 rounded-lg">
            <div className="flex items-center gap-1">
              <CirclePlusIcon className="w-4 h-4 text-yellow-800" />
              <span className="text-xs uppercase text-gray-500">En attente</span>
            </div>
            <p className="text-3xl text-zinc-700 font-bold font-title">500€ </p>
            <p className="text-sm text-zinc-500">(5 factures impayées)</p>
          </div>

          <div className="min-w-45 flex flex-col items-start gap-2 p-8 bg-red-100 rounded-lg">
            <div className="flex items-center gap-1">
              <AlertTriangle className="w-4 h-4 text-red-800" />
              <span className="text-xs uppercase text-gray-500">En retard</span>
            </div>
            <p className="text-3xl text-zinc-700 font-bold font-title">500€ </p>
            <p className="text-sm text-zinc-500">(5 factures en retard)</p>
          </div>

          <div className="min-w-45 flex flex-col items-start gap-2 p-8 bg-indigo-100 rounded-lg">
            <div className="flex items-center gap-1">
              <ChartLine className="w-4 h-4 text-indigo-800" />
              <span className="text-xs uppercase text-gray-500">Économies</span>
            </div>
            <p className="text-3xl text-zinc-700 font-bold font-title">145€</p>
            <p className="text-sm text-zinc-500">(Ce mois-ci)</p>
          </div>
        </div>
      </div>

      <h3 className="mt-12 text-xl font-bold font-title">Mes dernières factures</h3>
      <div className="mt-4">
        <InvoiceTable />
      </div>
    </div>
  )
}

export default Dashboard