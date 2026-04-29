import { SortDesc } from 'lucide-react'
import React from 'react'

function InvoiceSorter() {
  return (
    <div className="relative">
      <SortDesc className="text-zinc-400" />
      <div className="absolute -top-2 -right-2 rounded-full bg-white text-xs flex items-center justify-center">
        <ul>
          <li>Date</li>
          <li>Amount</li>
        </ul>
      </div>
    </div>
  )
}

export default InvoiceSorter