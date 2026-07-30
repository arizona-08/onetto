'use client';

import { Client } from '@/app/types';
import { X } from 'lucide-react'
import React from 'react'
import ClientCard from './ClientCard';

interface AddClientFormProps {
  isActive: boolean;
  setIsActive: (active: boolean) => void;
  handleAddClient: (newClient: Client) => void;
  clientToEdit: Client | null;
  handleEditClient: (clientToEdit: Client) => void;
}

function AddClientForm({ isActive, setIsActive, handleAddClient, clientToEdit, handleEditClient }: AddClientFormProps) {
  function closeForm() {
    setIsActive(false);
  }

  const [previewClient, setPreviewClient] = React.useState<Client>({
    id: 'PREVIEW',
    name: "",
    email: "",
    address: "",
    city: "",
    postalCode: "",
    country: "",
  });

  React.useEffect(() => {
    if (clientToEdit) {
      setPreviewClient(clientToEdit);
    }
  }, [clientToEdit]);

  function handleClientChange(field: keyof Client, value: string | number) {
    setPreviewClient((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  function resetForm() {
    setPreviewClient({
      id: 'PREVIEW',
      name: "",
      email: "",
      address: "",
      city: "",
      postalCode: "",
      country: "",
    });
  }

  if(!isActive) {
    return null;
  }

  return (
    <>
      <div className="dark-layer fixed z-20 inset-0 bg-black/50 backdrop-blur-lg"></div>
      <div className="fixed z-30 inset-0 flex items-center justify-center p-4 ">
        <div className="form-container bg-white rounded-md shadow-lg overflow-y-auto max-h-160 w-full max-w-220 md:flex md:flex-row-reverse">
          <form className="p-6 w-full md:w-4/6 md:h-full">
            <div className="mb-1 flex items-center justify-between">
              <h2 className="text-xl font-title font-black text-zinc-700">Créer un client</h2>
              <X onClick={() => {
                closeForm();
                resetForm();
                }} />
            </div>
            <p className="text-sm text-gray-400 mb-6">Remplissez les détails pour votre catalogue</p>
            
            {/* Champs principaux */}
            <div className='space-y-4'>
              <div className="flex flex-col gap-2">
                <label htmlFor="client-name" className="uppercase text-gray-600 text-xs font-title font-semibold tracking-wide">Nom du client</label>
                <input
                  type="text"
                  id="client-name"
                  name="name"
                  className="border-b border-gray-300 py-2 px-3 focus:outline-none"
                  placeholder='ex: Pose de carrelage'
                  onChange={(e) => handleClientChange('name', e.target.value)}
                  value={previewClient.name}
                />
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor="client-email" className="uppercase text-gray-600 text-xs font-title font-semibold tracking-wide">Email</label>
                <input
                  type="email"
                  id="client-email"
                  name="email"
                  className="border-b border-gray-300 py-2 px-3 focus:outline-none"
                  placeholder='ex: client@example.com'
                  onChange={(e) => handleClientChange('email', e.target.value)}
                  value={previewClient.email}
                />
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor="client-address" className="uppercase text-gray-600 text-xs font-title font-semibold tracking-wide">Rue</label>
                <input
                  type="text"
                  id="client-address"
                  name="address"
                  className="border-b border-gray-300 py-2 px-3 focus:outline-none"
                  placeholder='ex: 123 Rue de la Paix'
                  onChange={(e) => handleClientChange('address', e.target.value)}
                  value={previewClient.address}
                />
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor="client-city" className="uppercase text-gray-600 text-xs font-title font-semibold tracking-wide">Ville</label>
                <input
                  type="text"
                  id="client-city"
                  name="city"
                  className="border-b border-gray-300 py-2 px-3 focus:outline-none"
                  placeholder='ex: Paris'
                  onChange={(e) => handleClientChange('city', e.target.value)}
                  value={previewClient.city}
                />
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor="client-postalCode" className="uppercase text-gray-600 text-xs font-title font-semibold tracking-wide">Code postal</label>
                <input
                  type="text"
                  id="client-postalCode"
                  name="postalCode"
                  className="border-b border-gray-300 py-2 px-3 focus:outline-none"
                  placeholder='ex: 75001'
                  onChange={(e) => handleClientChange('postalCode', e.target.value)}
                  value={previewClient.postalCode}
                />
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor="client-country" className="uppercase text-gray-600 text-xs font-title font-semibold tracking-wide">Pays</label>
                <input
                  type="text"
                  id="client-country"
                  name="country"
                  className="border-b border-gray-300 py-2 px-3 focus:outline-none"
                  placeholder='ex: France'
                  onChange={(e) => handleClientChange('country', e.target.value)}
                  value={previewClient.country}
                />
              </div>
            </div>

            <div className="flex items-center justify-end mt-6">
              <button
                className="bg-primary hover:bg-bg-secondary text-white py-2 px-4 rounded-md focus:outline-none"
                onClick={(e) => {
                  e.preventDefault();
                  if (clientToEdit) {
                    handleEditClient(previewClient);
                  } else {
                    handleAddClient(previewClient);
                  }
                  resetForm();
                  closeForm();
                }}
              >
                {clientToEdit ? 'Modifier le client' : 'Créer le client'}
              </button>
            </div>
          </form>

          <div className="preview bg-custom-gray-light p-6 w-full md:w-2/6 md:h-150">
            <span className="uppercase text-gray-300 text-xs font-title font-semibold tracking-wide">Aperçu direct</span>
            <div className="mt-4">
              <ClientCard client={previewClient} />
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default AddClientForm