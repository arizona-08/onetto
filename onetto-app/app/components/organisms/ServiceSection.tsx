'use client';
import { Service } from '@/app/types'
import { Plus } from 'lucide-react'
import React from 'react'
import ServiceCard from '../molecules/Service/ServiceCard'
import AddServiceForm from '../molecules/Service/AddServiceForm'

interface ServiceSectionProps {
  services: Service[]
}
function ServiceSection({ services }: ServiceSectionProps) {

  const [isAddFormActive, setIsAddFormActive] = React.useState(false);
  const [masterServiceList, setMasterServiceList] = React.useState<Service[]>(services);

  const [serviceToEdit, setServiceToEdit] = React.useState<Service | null>(null);

  function handleAddService(newService: Service) {
    setMasterServiceList(prevList => [...prevList, newService]);
  }

  function handleTriggerEdit(serviceId: string) {
    console.log('Trigger edit for service ID:', serviceId);
    const service = masterServiceList.find(service => service.id === serviceId);
    if(service) {
      setServiceToEdit(service);
      setIsAddFormActive(true);
    }
  }
  function handleEditService(serviceToEdit: Service) {
    setMasterServiceList(prevList => prevList.map(service => service.id === serviceToEdit.id ? serviceToEdit : service));
  }

  function handleDeleteService(serviceId: string) {
    setMasterServiceList(prevList => prevList.filter(service => service.id !== serviceId));
  }


  return (
    <>
      <AddServiceForm
        isActive={isAddFormActive}
        setIsActive={setIsAddFormActive}
        handleAddService={handleAddService}
        serviceToEdit={serviceToEdit}
        handleEditService={handleEditService}
      />
      <div>
        <button 
          className="bg-primary hover:bg-primary-hover text-white font-medium py-2 px-4 rounded flex items-center gap-2 mt-6"
          onClick={() => setIsAddFormActive(true)}
        >
          <Plus className='w-4 h-4'/>
          Ajouter un service
        </button>

        <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
          {/* Render your list of services here */}
          {masterServiceList.map((service) => (
            <li key={service.id} className="h-full">
              <ServiceCard service={service} triggerEdit={handleTriggerEdit} triggerDelete={handleDeleteService} />
            </li>
          ))}
        </ul>
      </div>
    </>
  )
}

export default ServiceSection