'use client';

import React from 'react';
import { Wrench } from 'lucide-react';
import { Service } from '../../../types';
import ServiceCardMenu from './ServiceCardMenu';

interface ServiceCardProps {
  service: Service;
  triggerEdit?: (serviceId: string) => void;
  triggerDelete?: (serviceId: string) => void;
}

function ServiceCard({ service, triggerEdit, triggerDelete }: ServiceCardProps) {
  const unitPriceValue = typeof service.unitPrice === 'number'
    ? service.unitPrice
    : Number(service.unitPrice);
  const hasUnitPrice = Number.isFinite(unitPriceValue);
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);

  return (
    <article className="group relative h-full overflow-visible rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Wrench className="h-5 w-5" aria-hidden="true" />
          </div>
          <span className="truncate rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-semibold text-zinc-600">
            {service.category}
          </span>
        </div>
        <ServiceCardMenu
          isOpen={isMenuOpen}
          setIsOpen={setIsMenuOpen}
          serviceId={service.id}
          triggerEdit={triggerEdit}
          triggerDelete={triggerDelete}
        />
      </div>
      <h4 className="mt-5 text-lg font-bold text-zinc-900">{service.name}</h4>
      <p className="mt-2 min-h-10 text-sm leading-5 text-zinc-500">
        {service.description || 'Aucune description renseignée.'}
      </p>
      <div className="mt-5 flex items-end justify-between border-t border-zinc-100 pt-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
            Prix unitaire
          </p>
          <p className="mt-1 text-lg font-bold text-zinc-900">
            {hasUnitPrice ? unitPriceValue.toFixed(2) : 'N/A'} €
            <span className="ml-1 text-sm font-medium text-zinc-400">/ {service.unit}</span>
          </p>
        </div>
        <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
          TVA {service.taxRate}%
        </span>
      </div>
    </article>
  );
}

export default ServiceCard;
