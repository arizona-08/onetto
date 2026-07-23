'use client';
import { Service } from '@/app/types'
import { Plus } from 'lucide-react'
import React from 'react'
import ServiceCard from '../molecules/Service/ServiceCard'
import AddServiceForm from '../molecules/Service/AddServiceForm'
import DeleteServiceModal from '../molecules/Service/DeleteServiceModal'

interface ServiceSectionProps {
  services: Service[]
  canCreate: boolean
}
function ServiceSection({ services, canCreate }: ServiceSectionProps) {

  const [isAddFormActive, setIsAddFormActive] = React.useState(false);
  const [masterServiceList, setMasterServiceList] = React.useState<Service[]>(services);

  const [serviceToEdit, setServiceToEdit] = React.useState<Service | null>(null);
  const [serviceToDelete, setServiceToDelete] = React.useState<Service | null>(null);

  function handleAddService(newService: Service) {
    setMasterServiceList(prevList => [...prevList, newService]);
  }

  function handleTriggerEdit(serviceId: string) {
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

  function handleTriggerDelete(serviceId: string) {
    const service = masterServiceList.find(service => service.id === serviceId);
    if (service) {
      setServiceToDelete(service);
    }
  }

  function handleConfirmDelete() {
    if (serviceToDelete) {
      handleDeleteService(serviceToDelete.id);
      setServiceToDelete(null);
    }
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
      {serviceToDelete && (
        <div className="fixed inset-0 bg-black/45 backdrop-blur-xl z-40 flex items-center justify-center p-4">
          <DeleteServiceModal
            service={serviceToDelete}
            onCancel={() => setServiceToDelete(null)}
            onConfirm={handleConfirmDelete}
          />
        </div>
      )}
      <div>
        <button 
          onClick={() => setIsAddFormActive(true)}
          disabled={!canCreate}
          title={canCreate ? undefined : 'L’entreprise active est fermée'}
          aria-disabled={!canCreate}
          className={`font-medium py-2 px-4 rounded flex items-center gap-2 mt-6 ${canCreate ? 'bg-primary hover:bg-primary-hover text-white' : 'cursor-not-allowed bg-zinc-200 text-zinc-500'}`}
        >
          <Plus className='w-4 h-4'/>
          Ajouter un service
        </button>

        <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
          {/* Render your list of services here */}
          {masterServiceList.map((service) => (
            <li key={service.id} className="h-full">
              <ServiceCard service={service} triggerEdit={handleTriggerEdit} triggerDelete={handleTriggerDelete} />
            </li>
          ))}
        </ul>
      </div>
    </>
  )
}

export default ServiceSection
