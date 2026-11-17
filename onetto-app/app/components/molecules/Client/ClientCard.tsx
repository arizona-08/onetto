"use client";

import React from "react";
import { Building2, Mail, MapPin, UserRound } from "lucide-react";
import ClientCardMenu from "./ClientCardMenu";
import { Client } from "@/app/types";

interface ClientCardProps {
  client: Client;
  triggerEdit?: (clientId: string) => void;
  triggerDelete?: (clientId: string) => void;
  view?: "grid" | "list";
  showMenu?: boolean;
}

function ClientCard({ client, triggerEdit, triggerDelete, view = "grid", showMenu = true }: ClientCardProps) {
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);

  return (
    <article className={`group relative h-full min-w-0 rounded-ui-card border border-ui-border bg-ui-surface p-5 shadow-ui-card transition-colors hover:border-ui-primary/40 ${view === "list" ? "sm:flex sm:items-start sm:gap-6" : ""}`}>
      <div className={`flex items-start justify-between gap-4 ${view === "list" ? "sm:w-1/3" : ""}`}>
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-ui-control bg-ui-primary-soft text-ui-primary">
            {client.clientType === "BUSINESS" ? <Building2 className="h-5 w-5" aria-hidden="true" /> : <UserRound className="h-5 w-5" aria-hidden="true" />}
          </div>
          <div className="min-w-0">
            <h4 className="truncate font-title text-base font-semibold text-ui-text">
              {client.name || "Nom du client"}
            </h4>
            <p className="mt-1 inline-flex rounded-full bg-ui-primary-soft px-2.5 py-0.5 text-xs font-medium text-ui-primary">
              {client.clientType === "BUSINESS" ? "Entreprise" : "Particulier"}
            </p>
          </div>
        </div>
        {showMenu && <ClientCardMenu
          isOpen={isMenuOpen}
          setIsOpen={setIsMenuOpen}
          clientId={client.id}
          triggerEdit={triggerEdit}
          triggerDelete={triggerDelete}
        />}
      </div>
      <div className={`min-w-0 space-y-3 border-t border-ui-border pt-4 text-sm text-ui-secondary ${view === "list" ? "mt-4 sm:mt-0 sm:flex-1 sm:border-t-0 sm:pt-0" : "mt-5"}`}>
        <div className="flex items-center gap-2">
          <Mail className="h-4 w-4 shrink-0 text-ui-secondary" aria-hidden="true" />
          <span className="min-w-0 break-all">{client.email || "—"}</span>
        </div>
        <div className="flex items-start gap-2">
          <MapPin
            className="mt-0.5 h-4 w-4 shrink-0 text-ui-secondary"
            aria-hidden="true"
          />
          <span>
            {[client.address, [client.postalCode, client.city].filter(Boolean).join(" "), client.country].filter(Boolean).join(", ") || "—"}
          </span>
        </div>
        {client.clientType === "BUSINESS" &&
          (client.siren || client.vatNumber || client.electronicAddress) && (
            <div className="flex flex-wrap gap-x-5 gap-y-1 border-t border-ui-border pt-3 text-xs text-ui-secondary">
              {client.siren && <p>SIREN : <span className="font-medium text-ui-text">{client.siren}</span></p>}
              {client.vatNumber && <p>TVA : <span className="font-medium text-ui-text">{client.vatNumber}</span></p>}
              {client.electronicAddress && (
                <p className="break-all">
                  Réception :{" "}
                  {client.electronicAddressScheme
                    ? `${client.electronicAddressScheme}:`
                    : ""}
                  {client.electronicAddress}
                </p>
              )}
            </div>
          )}
      </div>
    </article>
  );
}

export default ClientCard;
