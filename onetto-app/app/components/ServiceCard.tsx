import React from 'react'
import { Service } from '../types'

interface ServiceCardProps {
  service: Service
}

function ServiceCard({ service }: ServiceCardProps) {
  return (
    <div className="relative bg-white p-4 rounded-md shadow-md overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-1 bg-gray-800 opacity-50"></div>
      <span className="text-xs text-zinc-400 uppercase">{service.category}</span>
      <h4 className="text-xl font-bold font-title mb-2">{service.name}</h4>
      <p className="text-sm text-zinc-400">{service.description}</p>
      <div className="mt-4 flex items-center justify-between">
        <p><span className="font-semibold">{service.unitPrice.toFixed(2)}€</span> <span className="text-sm text-zinc-400">/ {service.unit}</span></p>
        <span className="inline-block px-2 py-1 rounded-full text-xs text-zinc-50 bg-zinc-300">TVA: {service.taxRate}%</span>
      </div>
    </div>
  )
}

export default ServiceCard