import { SortDesc } from 'lucide-react'
import React from 'react'

interface DocumentSorterProps {
  type: 'invoices' | 'estimates'
  sortMethod: 'date' |  'amount'
  setSortMethod: (sort: 'date' | 'amount') => void
  isOpen: boolean
  setIsOpen: (isOpen: boolean) => void
}

function DocumentSorter({sortMethod, setSortMethod, isOpen, setIsOpen}: DocumentSorterProps) {

  function closeSort(){
    setIsOpen(false);
  }
  return (
    <div className={`relative `}>
      <div className="flex items-center gap-1 w-fit" onClick={() => setIsOpen(!isOpen)}>
        <SortDesc className="text-zinc-400 cursor-pointer" />
        <span className="text-zinc-400 text-sm">Trier</span>
      </div>
      <div className={`${isOpen ? 'block' : 'hidden'} absolute top-full right-0 p-1 min-w-35 rounded-lg bg-white text-sm border border-gray-100 shadow-sm`}>
        <ul className="space-y-1">
          <li className={`px-3 py-1 rounded-md hover:bg-gray-200 ${sortMethod === 'date' ? 'bg-gray-200' : ''}`} onClick={() => {
            setSortMethod('date')
            closeSort()
            }}>Date</li>
          <li className={`px-3 py-1 rounded-md hover:bg-gray-200 ${sortMethod === 'amount' ? 'bg-gray-200' : ''}`} onClick={() => {
            setSortMethod('amount')
            closeSort()
            }}>Montant</li>
        </ul>
      </div>
    </div>
  )
}

export default DocumentSorter