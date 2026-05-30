'use client';
import { Client } from '@/app/types'
import { Plus } from 'lucide-react'
import React from 'react'
import ClientCard from '../molecules/Client/ClientCard';
import AddClientForm from '../molecules/Client/AddClientForm';

interface ClientSectionProps {
  clients: Client[]
}

function ClientSection({ clients }: ClientSectionProps) {

  const [isAddFormActive, setIsAddFormActive] = React.useState(false);
  const [masterClientList, setMasterClientList] = React.useState<Client[]>(clients);

  function handleAddClient(newClient: Client) {
    setMasterClientList(prevList => [...prevList, newClient]);
  }

  return (
    <>
      <AddClientForm
        isActive={isAddFormActive}
        setIsActive={setIsAddFormActive}
        handleAddClient={handleAddClient}
      />
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
              <ClientCard client={client} />
            </li>
          ))}
        </ul>
      </div>
    </>
  )
}

export default ClientSection