'use client';
import { Client } from '@/app/types'
import { Plus } from 'lucide-react'
import React from 'react'
import ClientCard from '../molecules/Client/ClientCard';
import AddClientForm from '../molecules/Client/AddClientForm';
import DeleteClientModal from '../molecules/Client/DeleteClientModal';
import {
  createActiveCompanyClient,
  deleteActiveCompanyClient,
  updateActiveCompanyClient,
} from '@/lib/companies/catalog';
import { useToast } from '../context/ToastContext';

interface ClientSectionProps {
  clients: Client[]
  canCreate: boolean
}

function ClientSection({ clients, canCreate }: ClientSectionProps) {

  const [isAddFormActive, setIsAddFormActive] = React.useState(false);
  const [masterClientList, setMasterClientList] = React.useState<Client[]>(clients);
  const [clientToEdit, setClientToEdit] = React.useState<Client | null>(null);
  const [clientToDelete, setClientToDelete] = React.useState<Client | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const { showToast } = useToast();

  async function handleAddClient(newClient: Client) {
    const response = await createActiveCompanyClient(newClient);

    if (!response.ok) {
      showToast('Impossible de créer ce client.', 'error');
      return false;
    }

    setMasterClientList((clients) => [...clients, response.data]);
    showToast('Client créé avec succès.', 'success');
    return true;
  }

  function handleTriggerEdit(clientId: string) {
    const client = masterClientList.find(client => client.id === clientId);
    if (client) {
      setClientToEdit(client);
      setIsAddFormActive(true);
    }
  }

  async function handleEditClient(clientToEdit: Client) {
    const response = await updateActiveCompanyClient(clientToEdit);

    if (!response.ok) {
      showToast('Impossible de modifier ce client.', 'error');
      return false;
    }

    setMasterClientList((clients) => clients.map((client) => (
      client.id === clientToEdit.id ? response.data : client
    )));
    showToast('Client modifié avec succès.', 'success');
    return true;
  }

  function handleTriggerDelete(clientId: string) {
    const client = masterClientList.find(client => client.id === clientId);
    if (client) {
      setClientToDelete(client);
    }
  }

  async function handleConfirmDelete() {
    if (!clientToDelete) {
      return;
    }

    setIsDeleting(true);
    const response = await deleteActiveCompanyClient(clientToDelete.id);
    setIsDeleting(false);

    if (!response.ok) {
      showToast('Impossible de supprimer ce client.', 'error');
      return;
    }

    setMasterClientList((clients) => clients.filter((client) => (
      client.id !== clientToDelete.id
    )));
    setClientToDelete(null);
    showToast('Client supprimé avec succès.', 'success');
  }

  return (
    <>
      <AddClientForm
        isActive={isAddFormActive}
        setIsActive={setIsAddFormActive}
        onClose={() => setClientToEdit(null)}
        handleAddClient={handleAddClient}
        clientToEdit={clientToEdit}
        handleEditClient={handleEditClient}
      />
      {clientToDelete && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/45 p-4 backdrop-blur-xl"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-client-title"
        >
          <DeleteClientModal
            client={clientToDelete}
            isDeleting={isDeleting}
            onCancel={() => setClientToDelete(null)}
            onConfirm={() => void handleConfirmDelete()}
          />
        </div>
      )}
      <div>
        <button 
          onClick={() => {
            setClientToEdit(null);
            setIsAddFormActive(true);
          }}
          disabled={!canCreate}
          title={canCreate ? undefined : 'L’entreprise active est fermée'}
          aria-disabled={!canCreate}
          className={`font-medium py-2 px-4 rounded flex items-center gap-2 mt-6 ${canCreate ? 'bg-primary hover:bg-primary-hover text-white' : 'cursor-not-allowed bg-zinc-200 text-zinc-500'}`}
        >
          <Plus className='w-4 h-4'/>
          Ajouter un client
        </button>

        <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
          {/* Render your list of clients here */}
          {masterClientList.map((client) => (
            <li key={client.id} className="h-full">
              <ClientCard client={client} triggerEdit={handleTriggerEdit} triggerDelete={handleTriggerDelete} />
            </li>
          ))}
        </ul>
      </div>
    </>
  )
}

export default ClientSection
