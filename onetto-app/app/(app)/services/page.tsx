import ServiceSection from '@/app/components/organisms/ServiceSection'
import { Service } from '@/app/types'
import { servicesData } from '@/shared/services'
import { Plus } from 'lucide-react'
import React from 'react'

function services() {
  return (
    <div>
      <h1 className="text-4xl font-black font-title">Mon catalogue de services</h1>

      <p className="text-gray-500 max-w-90 mt-3">Gérer vos services et gagnez du temps lors de la création de vos factures.</p>

      <ServiceSection services={servicesData} />
    </div>
  )
}

export default services