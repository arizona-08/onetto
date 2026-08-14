'use client';

import React from 'react';
import { Mail, MapPin, UserRound } from 'lucide-react';
import ClientCardMenu from './ClientCardMenu';
import { Client } from '@/app/types';

interface ClientCardProps {
  client: Client;
  triggerEdit?: (clientId: string) => void;
  triggerDelete?: (clientId: string) => void;
}

function ClientCard({ client, triggerEdit, triggerDelete }: ClientCardProps) {
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);

  return (
    <article className="group relative h-full overflow-visible rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <UserRound className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h4 className="truncate text-lg font-bold text-zinc-900">{client.name}</h4>
            <p className="mt-0.5 text-xs font-medium text-zinc-400">Client</p>
          </div>
        </div>
        <ClientCardMenu
          isOpen={isMenuOpen}
          setIsOpen={setIsMenuOpen}
          clientId={client.id}
          triggerEdit={triggerEdit}
          triggerDelete={triggerDelete}
        />
      </div>
      <div className="mt-5 space-y-3 border-t border-zinc-100 pt-4 text-sm text-zinc-600">
        <div className="flex items-center gap-2">
          <Mail className="h-4 w-4 shrink-0 text-zinc-400" aria-hidden="true" />
          <span className="truncate">{client.email}</span>
        </div>
        <div className="flex items-start gap-2">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400" aria-hidden="true" />
          <span>{client.address}, {client.postalCode} {client.city}, {client.country}</span>
        </div>
      </div>
    </article>
  );
}

export default ClientCard;
