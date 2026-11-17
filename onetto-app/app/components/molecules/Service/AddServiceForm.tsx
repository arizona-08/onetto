"use client";

import { Service } from "@/app/types";
import { LoaderCircle, X } from "lucide-react";
import React from "react";
import ServiceCard from "./ServiceCard";

interface AddServiceFormProps {
  isActive: boolean;
  setIsActive: (active: boolean) => void;
  onClose: () => void;
  handleAddService: (newService: Service) => Promise<boolean>;
  serviceToEdit: Service | null;
  handleEditService: (serviceToEdit: Service) => Promise<boolean>;
}

const emptyService: Service = {
  id: "PREVIEW", name: "", description: "", category: "",
  unitPrice: 0, unit: "", taxRate: 0, itemType: "SERVICES",
};
const fieldClass = "h-10 w-full rounded-ui-control border border-ui-border bg-ui-surface px-3 text-sm text-ui-text outline-none placeholder:text-ui-secondary/70 focus:border-ui-primary focus:ring-2 focus:ring-ui-primary/15";
const labelClass = "text-xs font-semibold uppercase tracking-wide text-ui-secondary";

export default function AddServiceForm({
  isActive, setIsActive, onClose, handleAddService, serviceToEdit, handleEditService,
}: AddServiceFormProps) {
  const [previewService, setPreviewService] = React.useState<Service>(serviceToEdit ?? emptyService);
  const [isSaving, setIsSaving] = React.useState(false);

  function closeForm() {
    setIsActive(false);
    onClose();
    setPreviewService(emptyService);
  }

  function handleServiceChange(field: keyof Service, value: string | number) {
    setPreviewService((previous) => ({ ...previous, [field]: value }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSaving) return;
    setIsSaving(true);
    try {
      const isSaved = serviceToEdit
        ? await handleEditService(previewService)
        : await handleAddService(previewService);
      if (isSaved) closeForm();
    } finally {
      setIsSaving(false);
    }
  }

  if (!isActive) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/40 p-3 backdrop-blur-sm sm:p-6" role="dialog" aria-modal="true" aria-labelledby="service-form-title">
      <div className="my-auto flex max-h-[calc(100dvh-1.5rem)] w-full max-w-4xl flex-col overflow-hidden rounded-ui-card border border-ui-border bg-ui-surface shadow-2xl sm:max-h-[calc(100dvh-3rem)] md:flex-row-reverse">
        <form onSubmit={handleSubmit} className="min-h-0 w-full overflow-y-auto p-5 sm:p-7 md:w-2/3">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 id="service-form-title" className="font-title text-2xl font-semibold text-ui-text">
                {serviceToEdit ? "Modifier un produit ou service" : "Créer un produit ou service"}
              </h2>
              <p className="mt-1 text-sm text-ui-secondary">Remplissez les détails pour votre catalogue.</p>
            </div>
            <button type="button" onClick={closeForm} aria-label="Fermer le formulaire" className="rounded-lg p-2 text-ui-secondary hover:bg-ui-subtle focus-visible:outline-2 focus-visible:outline-ui-primary">
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>

          <details className="mt-5 rounded-ui-control border border-ui-border bg-ui-primary-soft/30 p-4 md:hidden">
            <summary className="cursor-pointer text-sm font-semibold text-ui-text">Aperçu direct</summary>
            <div className="mt-4"><ServiceCard service={previewService} showMenu={false} /></div>
          </details>

          <div className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="service-name" className={labelClass}>Nom du produit ou service</label>
              <input id="service-name" name="name" type="text" value={previewService.name} onChange={(event) => handleServiceChange("name", event.target.value)} className={fieldClass} placeholder="Nom du produit ou service" />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="service-description" className={labelClass}>Description</label>
              <textarea id="service-description" name="description" value={previewService.description} onChange={(event) => handleServiceChange("description", event.target.value)} className={`${fieldClass} min-h-20 resize-y py-2`} placeholder="Décrivez votre produit ou service" />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="service-category" className={labelClass}>Catégorie</label>
              <input id="service-category" name="category" type="text" value={previewService.category} onChange={(event) => handleServiceChange("category", event.target.value)} className={fieldClass} placeholder="Catégorie" />
            </div>
            <fieldset>
              <legend className={labelClass}>Type</legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {([{ value: "GOODS", label: "Bien" }, { value: "SERVICES", label: "Service / prestation" }] as const).map((option) => (
                  <label key={option.value} className="flex cursor-pointer items-center gap-2 rounded-ui-control border border-ui-border px-3 py-2 text-sm text-ui-text has-[:checked]:border-ui-primary/50 has-[:checked]:bg-ui-primary-soft has-[:checked]:text-ui-primary">
                    <input type="radio" name="itemType" value={option.value} checked={previewService.itemType === option.value} onChange={() => handleServiceChange("itemType", option.value)} className="accent-ui-primary" />
                    {option.label}
                  </label>
                ))}
              </div>
            </fieldset>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label htmlFor="service-unit-price" className={labelClass}>Prix unitaire</label>
                <input id="service-unit-price" name="unitPrice" type="number" min={0} step="0.01" value={previewService.unitPrice} onChange={(event) => handleServiceChange("unitPrice", event.target.value)} className={fieldClass} placeholder="0,00 €" />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="service-unit" className={labelClass}>Unité</label>
                <input id="service-unit" name="unit" type="text" value={previewService.unit} onChange={(event) => handleServiceChange("unit", event.target.value)} className={fieldClass} placeholder="heure, m², pièce…" />
              </div>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="service-tax-rate" className={labelClass}>TVA (%)</label>
              <input id="service-tax-rate" name="taxRate" type="number" min={0} step="0.01" value={previewService.taxRate} onChange={(event) => handleServiceChange("taxRate", event.target.value)} className={fieldClass} placeholder="20" />
            </div>
          </div>

          <div className="mt-7 flex flex-wrap justify-end gap-2 border-t border-ui-border pt-5">
            <button type="button" onClick={closeForm} className="rounded-ui-control border border-ui-border px-4 py-2 text-sm font-medium text-ui-text hover:bg-ui-subtle focus-visible:outline-2 focus-visible:outline-ui-primary">Annuler</button>
            <button type="submit" disabled={isSaving} className="inline-flex items-center gap-2 rounded-ui-control bg-ui-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-ui-primary disabled:opacity-60">
              {isSaving && <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />}
              {serviceToEdit ? "Enregistrer les modifications" : "Enregistrer le produit ou service"}
            </button>
          </div>
        </form>

        <div className="hidden w-1/3 shrink-0 overflow-y-auto border-r border-ui-border bg-ui-primary-soft/30 p-6 md:block">
          <p className="text-sm font-semibold text-ui-secondary">Aperçu direct</p>
          <p className="mt-1 text-xs text-ui-secondary">La carte se met à jour au fil de la saisie.</p>
          <div className="mt-5"><ServiceCard service={previewService} showMenu={false} /></div>
        </div>
      </div>
    </div>
  );
}
