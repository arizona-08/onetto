"use client";

import React from "react";
import { Package, Wrench } from "lucide-react";
import { Service } from "../../../types";
import ServiceCardMenu from "./ServiceCardMenu";

const priceFormatter = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });

interface ServiceCardProps {
  service: Service;
  triggerEdit?: (serviceId: string) => void;
  triggerDelete?: (serviceId: string) => void;
  view?: "grid" | "list";
  showMenu?: boolean;
}

function ServiceCard({
  service,
  triggerEdit,
  triggerDelete,
  view = "grid",
  showMenu = true,
}: ServiceCardProps) {
  const unitPriceValue =
    typeof service.unitPrice === "number"
      ? service.unitPrice
      : Number(service.unitPrice);
  const hasUnitPrice = Number.isFinite(unitPriceValue);
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);

  return (
    <article className={`group relative h-full min-w-0 rounded-ui-card border border-ui-border bg-ui-surface p-5 shadow-ui-card transition-colors hover:border-ui-primary/40 ${view === "list" ? "sm:grid sm:grid-cols-[minmax(0,1fr)_auto] sm:gap-x-6" : ""}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-ui-control bg-ui-primary-soft text-ui-primary">
            {service.itemType === "GOODS" ? <Package className="h-5 w-5" aria-hidden="true" /> : <Wrench className="h-5 w-5" aria-hidden="true" />}
          </div>
          {service.category && <span className="truncate rounded-full bg-ui-subtle px-2.5 py-1 text-xs font-semibold text-ui-secondary">{service.category}</span>}
        </div>
        {showMenu && <ServiceCardMenu
          isOpen={isMenuOpen}
          setIsOpen={setIsMenuOpen}
          serviceId={service.id}
          triggerEdit={triggerEdit}
          triggerDelete={triggerDelete}
        />}
      </div>
      <h4 className="mt-5 font-title text-lg font-semibold text-ui-text">
        {service.name || "Nom du produit ou service"}
      </h4>
      <p className="mt-1 min-h-10 text-sm leading-5 text-ui-secondary">
        {service.description || "Aucune description renseignée."}
      </p>
      <div className={`mt-5 flex items-end justify-between gap-3 border-t border-ui-border pt-4 ${view === "list" ? "sm:col-start-2 sm:row-span-3 sm:row-start-1 sm:mt-0 sm:min-w-52 sm:border-t-0 sm:pt-0" : ""}`}>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-ui-secondary">
            Prix unitaire
          </p>
          <p className="mt-1 whitespace-nowrap text-lg font-semibold text-ui-text">
            {hasUnitPrice ? priceFormatter.format(unitPriceValue) : "N/A"}
            {service.unit && <span className="ml-1 text-sm font-medium text-ui-secondary">/ {service.unit}</span>}
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-ui-primary-soft px-2.5 py-1 text-xs font-semibold text-ui-primary">
          TVA {service.taxRate}%
        </span>
      </div>
    </article>
  );
}

export default ServiceCard;
