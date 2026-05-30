'use client';
import React from 'react'
import { Service } from '../../../types'
import ServiceCardMenu from './ServiceCardMenu'

interface ServiceCardProps {
  service: Service
  
}

function ServiceCard({ service }: ServiceCardProps) {

  const unitPriceValue = typeof service.unitPrice === 'number'
    ? service.unitPrice
    : Number(service.unitPrice);
  const hasUnitPrice = service.unitPrice !== '' && Number.isFinite(unitPriceValue);

  const [isMenuOpen, setIsMenuOpen] = React.useState(false);

  return (
    <div className="relative bg-white p-4 rounded-md shadow-md h-full overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-1 bg-primary opacity-75"></div>
      <div className="flex items-center justify-between">
        <span className="text-xs text-zinc-400 uppercase">{service.category}</span>
        <ServiceCardMenu isOpen={isMenuOpen} setIsOpen={setIsMenuOpen} />
      </div>
      <h4 className="text-xl font-bold font-title mb-2">{service.name}</h4>
      <p className="text-sm text-zinc-400">{service.description}</p>
      <div className="mt-4 flex items-center justify-between">
        <p><span className="font-semibold">{hasUnitPrice ? unitPriceValue.toFixed(2) : 'N/A'}€</span> <span className="text-sm text-zinc-400">/ {service.unit}</span></p>
        <span className="inline-block px-2 py-1 rounded-full text-xs text-zinc-50 bg-primary">TVA: {service.taxRate}%</span>
      </div>
    </div>
  )
}

export default ServiceCard