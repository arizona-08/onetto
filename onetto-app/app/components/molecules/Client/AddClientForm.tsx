"use client";

import { Client } from "@/app/types";
import { LoaderCircle, X } from "lucide-react";
import React from "react";
import ClientCard from "./ClientCard";

interface AddClientFormProps {
  isActive: boolean;
  setIsActive: (active: boolean) => void;
  onClose: () => void;
  handleAddClient: (newClient: Client) => Promise<boolean>;
  clientToEdit: Client | null;
  handleEditClient: (clientToEdit: Client) => Promise<boolean>;
}

const emptyClient: Client = {
  id: "PREVIEW", name: "", email: "", address: "", city: "",
  postalCode: "", country: "", clientType: "CLIENT",
};
const fieldClass = "h-10 w-full rounded-ui-control border border-ui-border bg-ui-surface px-3 text-sm text-ui-text outline-none placeholder:text-ui-secondary/70 focus:border-ui-primary focus:ring-2 focus:ring-ui-primary/15";
const labelClass = "text-xs font-semibold uppercase tracking-wide text-ui-secondary";

export default function AddClientForm({
  isActive, setIsActive, onClose, handleAddClient, clientToEdit, handleEditClient,
}: AddClientFormProps) {
  const [previewClient, setPreviewClient] = React.useState<Client>(clientToEdit ?? emptyClient);
  const [isSaving, setIsSaving] = React.useState(false);

  function closeForm() {
    setIsActive(false);
    onClose();
    setPreviewClient(emptyClient);
  }

  function handleClientChange(field: keyof Client, value: string) {
    setPreviewClient((previous) => ({ ...previous, [field]: value }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSaving) return;
    setIsSaving(true);
    try {
      const isSaved = clientToEdit
        ? await handleEditClient(previewClient)
        : await handleAddClient(previewClient);
      if (isSaved) closeForm();
    } finally {
      setIsSaving(false);
    }
  }

  if (!isActive) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/40 p-3 backdrop-blur-sm sm:p-6" role="dialog" aria-modal="true" aria-labelledby="client-form-title">
      <div className="my-auto flex max-h-[calc(100dvh-1.5rem)] w-full max-w-4xl flex-col overflow-hidden rounded-ui-card border border-ui-border bg-ui-surface shadow-2xl sm:max-h-[calc(100dvh-3rem)] md:flex-row-reverse">
        <form onSubmit={handleSubmit} className="min-h-0 w-full overflow-y-auto p-5 sm:p-7 md:w-2/3">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 id="client-form-title" className="font-title text-2xl font-semibold text-ui-text">
                {clientToEdit ? "Modifier un client" : "Créer un client"}
              </h2>
              <p className="mt-1 text-sm text-ui-secondary">Remplissez les détails pour votre catalogue.</p>
            </div>
            <button type="button" onClick={closeForm} aria-label="Fermer le formulaire" className="rounded-lg p-2 text-ui-secondary hover:bg-ui-subtle focus-visible:outline-2 focus-visible:outline-ui-primary">
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>

          <details className="mt-5 rounded-ui-control border border-ui-border bg-ui-primary-soft/30 p-4 md:hidden">
            <summary className="cursor-pointer text-sm font-semibold text-ui-text">Aperçu direct</summary>
            <div className="mt-4"><ClientCard client={previewClient} showMenu={false} /></div>
          </details>

          <div className="mt-6 space-y-4">
            <fieldset>
              <legend className={labelClass}>Type de client</legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {([{ value: "BUSINESS", label: "Entreprise" }, { value: "CLIENT", label: "Particulier" }] as const).map((option) => (
                  <label key={option.value} className="flex cursor-pointer items-center gap-2 rounded-ui-control border border-ui-border px-3 py-2 text-sm text-ui-text has-[:checked]:border-ui-primary/50 has-[:checked]:bg-ui-primary-soft has-[:checked]:text-ui-primary">
                    <input type="radio" name="clientType" value={option.value} checked={previewClient.clientType === option.value} onChange={() => handleClientChange("clientType", option.value)} className="accent-ui-primary" />
                    {option.label}
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="space-y-1.5">
              <label htmlFor="client-name" className={labelClass}>Nom du client</label>
              <input id="client-name" name="name" type="text" value={previewClient.name} onChange={(event) => handleClientChange("name", event.target.value)} className={fieldClass} placeholder="Nom du client" />
            </div>

            {previewClient.clientType === "BUSINESS" && (
              <div className="grid gap-4 sm:grid-cols-2">
                {([
                  ["siren", "SIREN"],
                  ["vatNumber", "TVA intracommunautaire"],
                  ["electronicAddress", "Adresse électronique de réception"],
                  ["electronicAddressScheme", "Schéma de réception"],
                ] as const).map(([field, label]) => (
                  <div key={field} className="space-y-1.5">
                    <label htmlFor={`client-${field}`} className={labelClass}>{label}</label>
                    <input id={`client-${field}`} type="text" value={previewClient[field] ?? ""} onChange={(event) => handleClientChange(field, event.target.value)} className={fieldClass} placeholder={field === "electronicAddressScheme" ? "ex. 0002" : undefined} />
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-1.5">
              <label htmlFor="client-email" className={labelClass}>Email</label>
              <input id="client-email" name="email" type="email" value={previewClient.email} onChange={(event) => handleClientChange("email", event.target.value)} className={fieldClass} placeholder="client@example.com" />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="client-address" className={labelClass}>Rue</label>
              <input id="client-address" name="address" type="text" value={previewClient.address} onChange={(event) => handleClientChange("address", event.target.value)} className={fieldClass} placeholder="Adresse du client" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label htmlFor="client-city" className={labelClass}>Ville</label>
                <input id="client-city" name="city" type="text" value={previewClient.city} onChange={(event) => handleClientChange("city", event.target.value)} className={fieldClass} placeholder="Ville" />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="client-postalCode" className={labelClass}>Code postal</label>
                <input id="client-postalCode" name="postalCode" type="text" value={previewClient.postalCode} onChange={(event) => handleClientChange("postalCode", event.target.value)} className={fieldClass} placeholder="Code postal" />
              </div>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="client-country" className={labelClass}>Pays</label>
              <input id="client-country" name="country" type="text" value={previewClient.country} onChange={(event) => handleClientChange("country", event.target.value)} className={fieldClass} placeholder="Pays" />
            </div>
          </div>

          <div className="mt-7 flex flex-wrap justify-end gap-2 border-t border-ui-border pt-5">
            <button type="button" onClick={closeForm} className="rounded-ui-control border border-ui-border px-4 py-2 text-sm font-medium text-ui-text hover:bg-ui-subtle focus-visible:outline-2 focus-visible:outline-ui-primary">Annuler</button>
            <button type="submit" disabled={isSaving} className="inline-flex items-center gap-2 rounded-ui-control bg-ui-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-ui-primary disabled:opacity-60">
              {isSaving && <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />}
              {clientToEdit ? "Enregistrer les modifications" : "Enregistrer le client"}
            </button>
          </div>
        </form>

        <div className="hidden w-1/3 shrink-0 overflow-y-auto border-r border-ui-border bg-ui-primary-soft/30 p-6 md:block">
          <p className="text-sm font-semibold text-ui-secondary">Aperçu direct</p>
          <p className="mt-1 text-xs text-ui-secondary">La carte se met à jour au fil de la saisie.</p>
          <div className="mt-5"><ClientCard client={previewClient} showMenu={false} /></div>
        </div>
      </div>
    </div>
  );
}
