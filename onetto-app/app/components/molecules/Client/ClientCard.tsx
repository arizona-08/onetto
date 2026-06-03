'use client';
import React from 'react'
import ClientCardMenu from './ClientCardMenu'
import { Client } from '@/app/types';

interface ClientCardProps {
  client: Client
  triggerEdit?: (clientId: string) => void;
  triggerDelete?: (clientId: string) => void;
}

function ClientCard({ client, triggerEdit, triggerDelete }: ClientCardProps) {

  const [isMenuOpen, setIsMenuOpen] = React.useState(false);

  return (
    <div className="relative bg-white p-4 rounded-md shadow-md h-full ">
      <div className="absolute top-0 left-0 w-full h-1 bg-primary opacity-75 rounded-tl-md rounded-tr-md"></div>
      <div className="flex items-center justify-between">
        <span className="text-xs text-zinc-400">{client.email}</span>
        <ClientCardMenu
          isOpen={isMenuOpen}
          setIsOpen={setIsMenuOpen}
          clientId={client.id}
          triggerEdit={triggerEdit}
          triggerDelete={triggerDelete}
        />
      </div>
      <h4 className="text-xl font-bold font-title mb-2">{client.name}</h4>
      <p className="text-sm text-zinc-400">{client.street} {client.postalCode}, {client.city}, {client.country}</p>
      {/* <div className="mt-4 flex items-center justify-between">
        <p><span className="font-semibold">{client.unitPrice !== '' ? client.unitPrice : 'N/A'}€</span> <span className="text-sm text-zinc-400">/ {client.unit}</span></p>
        <span className="inline-block px-2 py-1 rounded-full text-xs text-zinc-50 bg-primary">TVA: {client.taxRate}%</span>
      </div> */}
    </div>
  )
}

export default ClientCard