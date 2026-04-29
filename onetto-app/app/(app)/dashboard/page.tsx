import InvoiceTable from '@/app/components/InvoiceTable'
import { CirclePlusIcon } from 'lucide-react'
import React from 'react'

function Dashboard() {
  return (
    <div className="w-full">
      <span className="text-xs text-zinc-500">MON CHIFFRE D'AFFAIRES</span>
      <h1 className="text-5xl font-title font-black text-zinc-700">€12,345.67</h1>

      <div className="mt-8 w-full overflow-x-auto pb-4">
        <div className="flex items-center gap-3 flex-nowrap min-w-max">
          <div className="min-w-45 flex flex-col items-start gap-1 p-4 bg-green-100 rounded-lg ">
            <span className="text-xs uppercase text-gray-500">Payées</span>
            <p className="text-xl font-bold font-title">500€ </p>
            <p className="text-sm text-zinc-500">(5 factures payées)</p>
          </div>

          <div className="min-w-45 flex flex-col items-start gap-1 p-4 bg-orange-100 rounded-lg">
            <span className="text-xs uppercase text-gray-500">En attente</span>
            <p className="text-xl font-bold font-title">500€ </p>
            <p className="text-sm text-zinc-500">(5 factures impayées)</p>
          </div>

          <div className="min-w-45 flex flex-col items-start gap-1 p-4 bg-red-100 rounded-lg">
            <span className="text-xs uppercase text-gray-500">En retard</span>
            <p className="text-xl font-bold font-title">500€ </p>
            <p className="text-sm text-zinc-500">(5 factures en retard)</p>
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