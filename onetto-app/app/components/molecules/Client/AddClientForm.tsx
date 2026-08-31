'use client';

import { Client } from '@/app/types';
import { X } from 'lucide-react'
import React from 'react'
import ClientCard from './ClientCard';

interface AddClientFormProps {
  isActive: boolean;
  setIsActive: (active: boolean) => void;
  onClose: () => void;
  handleAddClient: (newClient: Client) => Promise<boolean>;
  clientToEdit: Client | null;
  handleEditClient: (clientToEdit: Client) => Promise<boolean>;
}

function AddClientForm({ isActive, setIsActive, onClose, handleAddClient, clientToEdit, handleEditClient }: AddClientFormProps) {
  function closeForm() {
    setIsActive(false);
    onClose();
  }

  const [previewClient, setPreviewClient] = React.useState<Client>({
    id: 'PREVIEW',
    name: "",
    email: "",
    address: "",
    city: "",
    postalCode: "",
    country: "",
    clientType: 'CLIENT',
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
      clientType: 'CLIENT',
    });
  }

  if(!isActive) {
    return null;
  }

  return (
    <>
      <div className="dark-layer fixed z-20 inset-0 bg-black/50 backdrop-blur-lg"></div>
      <div className="fixed z-30 inset-0 flex items-center justify-center p-4 ">
        <div className="form-container max-h-[calc(100dvh-2rem)] w-full max-w-220 overflow-y-auto rounded-md bg-white md:flex md:flex-row-reverse">
          <form className="w-full p-4 sm:p-6 md:h-full md:w-4/6">
            <div className="mb-1 flex items-center justify-between">
              <h2 className="text-xl font-title font-semibold text-zinc-700">Créer un client</h2>
              <X onClick={() => {
                closeForm();
                resetForm();
                }} />
            </div>
            <p className="text-sm text-gray-400 mb-6">Remplissez les détails pour votre catalogue</p>
            
            {/* Champs principaux */}
            <div className='space-y-4'>
              <fieldset className="flex flex-col gap-2">
                <legend className="uppercase text-gray-600 text-xs font-title font-semibold tracking-wide">Type de client</legend>
                <div className="flex gap-3">
                  <label className="flex cursor-pointer items-center gap-2 rounded-md border border-zinc-200 px-3 py-2 has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                    <input type="radio" name="clientType" value="BUSINESS" checked={previewClient.clientType === 'BUSINESS'} onChange={() => handleClientChange('clientType', 'BUSINESS')} />
                    Entreprise
                  </label>
                  <label className="flex cursor-pointer items-center gap-2 rounded-md border border-zinc-200 px-3 py-2 has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                    <input type="radio" name="clientType" value="CLIENT" checked={previewClient.clientType === 'CLIENT'} onChange={() => handleClientChange('clientType', 'CLIENT')} />
                    Particulier
                  </label>
                </div>
              </fieldset>
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

              {previewClient.clientType === 'BUSINESS' && <div className="grid gap-4 md:grid-cols-2">
                {(['siren', 'vatNumber', 'electronicAddress', 'electronicAddressScheme'] as const).map((field) => <div key={field} className="flex flex-col gap-2"><label className="uppercase text-gray-600 text-xs font-title font-semibold tracking-wide">{{ siren: 'SIREN', vatNumber: 'TVA intracommunautaire', electronicAddress: 'Adresse électronique de réception', electronicAddressScheme: 'Schéma de réception' }[field]}</label><input type="text" className="border-b border-gray-300 py-2 px-3 focus:outline-none" value={previewClient[field] ?? ''} onChange={(e) => handleClientChange(field, e.target.value)} placeholder={field === 'electronicAddressScheme' ? 'ex. 0002' : ''} /></div>)}
              </div>}

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
                onClick={async (e) => {
                  e.preventDefault();
                  const isSaved = clientToEdit
                    ? await handleEditClient(previewClient)
                    : await handleAddClient(previewClient);

                  if (!isSaved) {
                    return;
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
