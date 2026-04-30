'use client';
import { Service } from '@/app/types'
import { Plus } from 'lucide-react'
import React from 'react'
import ServiceCard from '../molecules/ServiceCard'
import AddServiceForm from '../molecules/AddServiceForm'

interface ServiceSectionProps {
  services: Service[]
}
function ServiceSection({ services }: ServiceSectionProps) {

  const [isAddFormActive, setIsAddFormActive] = React.useState(false);
  return (
    <>
      <AddServiceForm
        isActive={isAddFormActive}
        setIsActive={setIsAddFormActive}
      />
      <div>
        <button 
          className="bg-secondary hover:bg-primary text-white font-medium py-2 px-4 rounded flex items-center gap-2 mt-6"
          onClick={() => setIsAddFormActive(true)}
        >
          <Plus className='w-4 h-4'/>
          Ajouter un service
        </button>

        <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
          {/* Render your list of services here */}
          {services.map((service) => (
            <li key={service.id} className="h-full">
              <ServiceCard service={service} />
            </li>
          ))}
        </ul>
      </div>
    </>
  )
}

export default ServiceSection