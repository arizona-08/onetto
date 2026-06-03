'use client';
import { Client } from '@/app/types'
import { Plus } from 'lucide-react'
import React from 'react'
import ClientCard from '../molecules/Client/ClientCard';
import AddClientForm from '../molecules/Client/AddClientForm';
import DeleteClientModal from '../molecules/Client/DeleteClientModal';

interface ClientSectionProps {
  clients: Client[]
}

function ClientSection({ clients }: ClientSectionProps) {

  const [isAddFormActive, setIsAddFormActive] = React.useState(false);
  const [masterClientList, setMasterClientList] = React.useState<Client[]>(clients);
  const [clientToEdit, setClientToEdit] = React.useState<Client | null>(null);
  const [clientToDelete, setClientToDelete] = React.useState<Client | null>(null);

  function handleAddClient(newClient: Client) {
    setMasterClientList(prevList => [...prevList, newClient]);
  }

  function handleTriggerEdit(clientId: string) {
    const client = masterClientList.find(client => client.id === clientId);
    if (client) {
      setClientToEdit(client);
      setIsAddFormActive(true);
    }
  }

  function handleEditClient(clientToEdit: Client) {
    setMasterClientList(prevList => prevList.map(client => client.id === clientToEdit.id ? clientToEdit : client));
  }

  function handleDeleteClient(clientId: string) {
    setMasterClientList(prevList => prevList.filter(client => client.id !== clientId));
  }

  function handleTriggerDelete(clientId: string) {
    const client = masterClientList.find(client => client.id === clientId);
    if (client) {
      setClientToDelete(client);
    }
  }

  function handleConfirmDelete() {
    if (clientToDelete) {
      handleDeleteClient(clientToDelete.id);
      setClientToDelete(null);
    }
  }

  return (
    <>
      <AddClientForm
        isActive={isAddFormActive}
        setIsActive={setIsAddFormActive}
        handleAddClient={handleAddClient}
        clientToEdit={clientToEdit}
        handleEditClient={handleEditClient}
      />
      {clientToDelete && (
        <div className="fixed inset-0 bg-black/45 backdrop-blur-xl z-40 flex items-center justify-center p-4">
          <DeleteClientModal
            client={clientToDelete}
            onCancel={() => setClientToDelete(null)}
            onConfirm={handleConfirmDelete}
          />
        </div>
      )}
      <div>
        <button 
          className="bg-primary hover:bg-primary-hover text-white font-medium py-2 px-4 rounded flex items-center gap-2 mt-6"
          onClick={() => setIsAddFormActive(true)}
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