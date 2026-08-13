'use client';
import { Service } from '@/app/types'
import { Plus } from 'lucide-react'
import React from 'react'
import ServiceCard from '../molecules/Service/ServiceCard'
import AddServiceForm from '../molecules/Service/AddServiceForm'
import DeleteServiceModal from '../molecules/Service/DeleteServiceModal'
import {
  createActiveCompanyService,
  deleteActiveCompanyService,
  updateActiveCompanyService,
} from '@/lib/companies/catalog';
import { useToast } from '../context/ToastContext';

interface ServiceSectionProps {
  services: Service[]
  canCreate: boolean
}
function ServiceSection({ services, canCreate }: ServiceSectionProps) {

  const [isAddFormActive, setIsAddFormActive] = React.useState(false);
  const [masterServiceList, setMasterServiceList] = React.useState<Service[]>(services);

  const [serviceToEdit, setServiceToEdit] = React.useState<Service | null>(null);
  const [serviceToDelete, setServiceToDelete] = React.useState<Service | null>(null);
  const { showToast } = useToast();

  async function handleAddService(newService: Service) {
    const response = await createActiveCompanyService(newService);

    if (!response.ok) {
      showToast('Impossible de créer ce service.', 'error');
      return false;
    }

    setMasterServiceList((services) => [...services, response.data]);
    showToast('Service créé avec succès.', 'success');
    return true;
  }

  function handleTriggerEdit(serviceId: string) {
    const service = masterServiceList.find(service => service.id === serviceId);
    if(service) {
      setServiceToEdit(service);
      setIsAddFormActive(true);
    }
  }
  
  async function handleEditService(serviceToEdit: Service) {
    const response = await updateActiveCompanyService(serviceToEdit);

    if (!response.ok) {
      showToast('Impossible de modifier ce service.', 'error');
      return false;
    }

    setMasterServiceList((services) => services.map((service) => (
      service.id === serviceToEdit.id ? response.data : service
    )));
    showToast('Service modifié avec succès.', 'success');
    return true;
  }

  function handleTriggerDelete(serviceId: string) {
    const service = masterServiceList.find(service => service.id === serviceId);
    if (service) {
      setServiceToDelete(service);
    }
  }

  async function handleConfirmDelete() {
    if (!serviceToDelete) {
      return;
    }

    const response = await deleteActiveCompanyService(serviceToDelete.id);

    if (!response.ok) {
      showToast('Impossible de supprimer ce service.', 'error');
      return;
    }

    setMasterServiceList((services) => services.filter((service) => (
      service.id !== serviceToDelete.id
    )));
    setServiceToDelete(null);
    showToast('Service supprimé avec succès.', 'success');
  }


  return (
    <>
      <AddServiceForm
        isActive={isAddFormActive}
        setIsActive={setIsAddFormActive}
        onClose={() => setServiceToEdit(null)}
        handleAddService={handleAddService}
        serviceToEdit={serviceToEdit}
        handleEditService={handleEditService}
      />
      {serviceToDelete && (
        <div className="fixed inset-0 bg-black/45 backdrop-blur-xl z-40 flex items-center justify-center p-4">
          <DeleteServiceModal
            service={serviceToDelete}
            onCancel={() => setServiceToDelete(null)}
            onConfirm={() => void handleConfirmDelete()}
          />
        </div>
      )}
      <div>
        <button 
          onClick={() => {
            setServiceToEdit(null);
            setIsAddFormActive(true);
          }}
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
