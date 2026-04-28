import InvoiceTable from '@/app/components/InvoiceTable'
import { CirclePlusIcon } from 'lucide-react'
import React from 'react'

function Dashboard() {
  return (
    <div>
      <span className="text-xs text-zinc-500">MON CHIFFRE D'AFFAIRES</span>
      <h1 className="text-5xl font-title font-black text-zinc-700">€12,345.67</h1>

      <button className="flex flex-col items-center justify-center gap-3 mt-4 p-4 bg-white text-primary rounded-lg hover:bg-secondary transition-colors">
        <CirclePlusIcon />
        <span className="text-sm font-medium">Créer une facture</span>
      </button>

      <InvoiceTable />
    </div>
  )
}

export default Dashboard