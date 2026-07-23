
import Greetings from '@/app/components/atoms/Greetings'
import InvoiceTable from '@/app/components/organisms/InvoiceTable'
import { getMyInvoicesServer } from '@/lib/invoices/invoice.server'
import { AlertTriangle } from 'lucide-react'
import { ChartLine } from 'lucide-react'
import { Check } from 'lucide-react'
import { CirclePlusIcon } from 'lucide-react'
import React from 'react'

async function Dashboard() {
  return (
    <div className="w-full p-4">
      <div>
        <div className="mb-8">
          <Greetings />
        </div>
        <span className="text-xs text-zinc-500">MON CHIFFRE D'AFFAIRES</span>
        <h1 className="text-5xl font-title font-black text-zinc-700">€12,345.67</h1>

        <div className="flex items-center gap-4 mt-2">
          {/* progress bar */}
          <div className="relative h-2 w-90 bg-white rounded-full shadow-xs">
            <div className="absolute top-0 left-0 h-full w-3/4 bg-green-500 rounded-full"></div>
          </div>

          <p className="text-sm text-gray-500">75% de votre objectif de 25,000€</p>
        </div>
      </div>
    </div>
  )
}

export default Dashboard