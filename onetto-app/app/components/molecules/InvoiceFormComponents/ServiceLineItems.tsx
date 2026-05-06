import { ServiceLineItem } from '@/app/types'
import { Plus } from 'lucide-react'
import React from 'react'


const serviceLineItems: ServiceLineItem[] = [
  {
    description: "Développement site vitrine",
    quantity: 1,
    unitPrice: 1000,
    unit: "site",
  },
  {
    description: "Développement SaaS personnalisé",
    quantity: 1,
    unitPrice: 5000,
    unit: "SaaS",
  },
  {
    description: "Maintenance mensuelle",
    quantity: 1,
    unitPrice: 5,
    unit: "session",
  },

]

function ServiceLineItems() {
  return (
    <div className="border border-gray-200 rounded-md p-4 mb-6">
      <header className="flex flex-col items-center mb-10 md:flex-row md:justify-between">
        <div className='flex items-center gap-4 w-full md:w-fit'>
          <div className="w-10 h-10 bg-secondary rounded-full flex items-center justify-center text-white font-semibold font-title">
            <span>02</span>
          </div>
          <h2 className="text-lg font-title font-semibold mb-1">Détails du service</h2>
        </div>

        <div className="mt-2 md:mt-0">
          <button className="flex items-center gap-2 text-sm text-secondary font-medium hover:text-secondary/80 transition-colors">
            <Plus size={16} />
            <span>Ajouter un service</span>
          </button>
        </div>

      </header>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left min-w-140">
          <thead className="border-b border-gray-200  text-sm text-gray-500">
            <tr className="">
              <th className="pb-5 font-bold font-title tracking-wide">Description</th>
              <th className="pb-5 font-bold font-title tracking-wide">Quantité</th>
              <th className="pb-5 font-bold font-title tracking-wide">Prix unitaire</th>
              <th className="pb-5 font-bold font-title tracking-wide">Total</th>
            </tr>
          </thead>
          <tbody>
            {serviceLineItems.map((lineItem, index) => (
              <tr key={index}>
                <td className="py-4 border-b border-gray-200 font-semibold">{lineItem.description}</td>
                <td className="py-4 border-b border-gray-200">{lineItem.quantity}</td>
                <td className="py-4 border-b border-gray-200">{lineItem.unitPrice} / {lineItem.unit}</td>
                <td className="py-4 border-b border-gray-200 font-semibold">{lineItem.unitPrice * lineItem.quantity} €</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default ServiceLineItems