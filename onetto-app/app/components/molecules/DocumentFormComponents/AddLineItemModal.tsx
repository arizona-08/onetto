"use client";

import { Service, ServiceLineItem } from "@/app/types";
import { getActiveCompanyServices } from "@/lib/companies/catalog";
import { ChevronDown, X } from "lucide-react";
import React from "react";
import { createPortal } from "react-dom";
import { calculateDiscountedUnitPrice } from "./line-item-discount";

interface AddLineItemModalProps {
  isVisible: boolean;
  onClose: () => void;
  onAddLineItem: (lineItem: ServiceLineItem) => void;
  lineItemToModify: { item: ServiceLineItem | null; index: number | null } | null;
  onEditLineItem: (lineItem: ServiceLineItem, index: number) => void;
}

const emptyLineItem: ServiceLineItem = {
  description: "",
  quantity: 1,
  unitPrice: 0,
  taxRate: 0,
  unit: "",
  itemType: "SERVICES",
};

const fieldClass = "h-11 w-full rounded-ui-control border border-ui-border bg-ui-surface px-4 text-sm text-ui-text shadow-ui-card outline-none transition-colors placeholder:text-ui-secondary/70 focus:border-ui-primary focus:ring-2 focus:ring-ui-primary/15";
const labelClass = "mb-2 block text-sm font-medium text-ui-text";

export default function AddLineItemModal(props: AddLineItemModalProps) {
  const { isVisible, onClose } = props;
  const [predefinedServices, setPredefinedServices] = React.useState<Service[]>([]);
  const [isLoadingServices, setIsLoadingServices] = React.useState(true);

  React.useEffect(() => {
    let active = true;
    void getActiveCompanyServices().then((response) => {
      if (!active) return;
      if (response.ok) {
        setPredefinedServices(response.data.map((service) => ({
          ...service,
          taxRate: service.taxRate ?? 0,
        })));
      }
      setIsLoadingServices(false);
    });
    return () => { active = false; };
  }, []);

  React.useEffect(() => {
    if (!isVisible) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [isVisible, onClose]);

  if (!props.isVisible || typeof document === "undefined") return null;

  return createPortal(
    <AddLineItemDialog
      key={props.lineItemToModify?.index ?? "new"}
      {...props}
      predefinedServices={predefinedServices}
      isLoadingServices={isLoadingServices}
    />,
    document.body,
  );
}

function AddLineItemDialog({
  onClose,
  onAddLineItem,
  lineItemToModify,
  onEditLineItem,
  predefinedServices,
  isLoadingServices,
}: AddLineItemModalProps & { predefinedServices: Service[]; isLoadingServices: boolean }) {
  const [lineItemDetails, setLineItemDetails] = React.useState<ServiceLineItem>(
    () => ({ ...(lineItemToModify?.item ?? emptyLineItem) }),
  );
  const [selectedServiceId, setSelectedServiceId] = React.useState("");
  const [discountType, setDiscountType] = React.useState<"PERCENT" | "AMOUNT">("PERCENT");
  const [discountValue, setDiscountValue] = React.useState(0);
  const discountedUnitPrice = calculateDiscountedUnitPrice(
    lineItemDetails.unitPrice,
    discountType,
    discountValue,
  );
  const discountIsValid = discountedUnitPrice !== null;

  function handleServiceSelect(serviceId: string) {
    setSelectedServiceId(serviceId);
    setDiscountValue(0);
    const service = predefinedServices.find((item) => item.id === serviceId);
    setLineItemDetails(service ? {
      description: service.description ?? "",
      quantity: 1,
      unitPrice: service.unitPrice,
      taxRate: service.taxRate,
      unit: service.unit,
      itemType: service.itemType,
    } : { ...emptyLineItem });
  }

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = event.target;
    setLineItemDetails((previous) => ({
      ...previous,
      [name]: ["quantity", "unitPrice", "taxRate"].includes(name) ? Number(value) : value,
    }));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (discountedUnitPrice === null) return;
    const discountedLineItem = { ...lineItemDetails, unitPrice: discountedUnitPrice };
    if (lineItemToModify) {
      onEditLineItem(discountedLineItem, lineItemToModify.index ?? 0);
    } else {
      onAddLineItem(discountedLineItem);
    }
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-slate-950/40 p-3 backdrop-blur-md sm:p-6"
      onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="line-item-dialog-title"
        className="my-auto max-h-[calc(100dvh-1.5rem)] w-full max-w-2xl overflow-y-auto rounded-ui-card border border-ui-border bg-ui-surface shadow-ui-popover sm:max-h-[calc(100dvh-3rem)]"
      >
        <header className="flex items-start justify-between gap-4 border-b border-ui-border px-5 py-5 sm:px-7">
          <div>
            <h2 id="line-item-dialog-title" className="font-title text-xl font-semibold text-ui-text">
              {lineItemToModify ? "Modifier le service" : "Ajouter un service"}
            </h2>
            <p className="mt-1 text-sm text-ui-secondary">Renseignez les détails qui apparaîtront sur le document.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Fermer la fenêtre" className="rounded-lg p-2 text-ui-secondary hover:bg-ui-subtle focus-visible:outline-2 focus-visible:outline-ui-primary">
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </header>

        <form onSubmit={handleSubmit} className="space-y-5 px-5 py-5 sm:px-7 sm:py-6">
          <div>
            <label htmlFor="catalog-service" className={labelClass}>Choisir depuis le catalogue</label>
            <div className="relative">
              <select
                id="catalog-service"
                value={selectedServiceId}
                onChange={(event) => handleServiceSelect(event.target.value)}
                className={`${fieldClass} appearance-none pr-10`}
              >
                <option value="">Saisir un article librement</option>
                {isLoadingServices && <option disabled>Chargement des services…</option>}
                {!isLoadingServices && predefinedServices.length === 0 && <option disabled>Aucun service enregistré</option>}
                {predefinedServices.map((service) => <option key={service.id} value={service.id}>{service.name}</option>)}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ui-secondary" aria-hidden="true" />
            </div>
          </div>

          <div>
            <label htmlFor="line-description" className={labelClass}>Titre du service</label>
            <input id="line-description" type="text" name="description" value={lineItemDetails.description} onChange={handleChange} placeholder="Description du service" className={fieldClass} />
          </div>

          <fieldset>
            <legend className={labelClass}>Type de ligne</legend>
            <div className="flex flex-wrap gap-2">
              {([{ value: "GOODS", label: "Bien" }, { value: "SERVICES", label: "Service / prestation" }] as const).map((item) => (
                <label key={item.value} className="flex cursor-pointer items-center gap-2 rounded-ui-control border border-ui-border px-3 py-2 text-sm text-ui-text has-[:checked]:border-ui-primary/50 has-[:checked]:bg-ui-primary-soft has-[:checked]:text-ui-primary">
                  <input type="radio" name="itemType" value={item.value} checked={lineItemDetails.itemType === item.value} onChange={() => setLineItemDetails((previous) => ({ ...previous, itemType: item.value }))} className="accent-ui-primary" />
                  {item.label}
                </label>
              ))}
            </div>
          </fieldset>

          <div className="grid gap-4 rounded-ui-control bg-ui-primary-soft/40 p-4 sm:grid-cols-2">
            <div>
              <label htmlFor="line-quantity" className={labelClass}>Quantité</label>
              <input id="line-quantity" type="number" name="quantity" value={lineItemDetails.quantity} onChange={handleChange} className={fieldClass} />
            </div>
            <div>
              <label htmlFor="line-unit-price" className={labelClass}>Prix unitaire (€)</label>
              <input id="line-unit-price" type="number" name="unitPrice" step="0.01" value={lineItemDetails.unitPrice} onChange={handleChange} className={fieldClass} />
            </div>
            <div>
              <label htmlFor="line-unit" className={labelClass}>Unité</label>
              <input id="line-unit" type="text" name="unit" value={lineItemDetails.unit} onChange={handleChange} placeholder="heure, m², pièce…" className={fieldClass} />
            </div>
            <div>
              <label htmlFor="line-tax-rate" className={labelClass}>TVA (%)</label>
              <input id="line-tax-rate" type="number" name="taxRate" min={0} max={100} step="0.01" value={lineItemDetails.taxRate} onChange={handleChange} className={fieldClass} />
            </div>
          </div>

          <fieldset className="rounded-ui-control border border-ui-border bg-ui-subtle p-4">
            <legend className="px-1 text-sm font-semibold text-ui-text">Remise sur cet article</legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="line-discount-type" className={labelClass}>Type de remise</label>
                <select id="line-discount-type" value={discountType} onChange={(event) => setDiscountType(event.target.value as "PERCENT" | "AMOUNT")} className={fieldClass}>
                  <option value="PERCENT">Pourcentage</option>
                  <option value="AMOUNT">€ par unité</option>
                </select>
              </div>
              <div>
                <label htmlFor="line-discount-value" className={labelClass}>Montant {discountType === "PERCENT" ? "(%)" : "(€)"}</label>
                <input id="line-discount-value" type="number" min={0} max={discountType === "PERCENT" ? 100 : lineItemDetails.unitPrice} step="0.01" value={discountValue} onChange={(event) => setDiscountValue(Number(event.target.value))} aria-invalid={!discountIsValid} className={fieldClass} />
              </div>
            </div>
            {!discountIsValid && <p role="alert" className="mt-2 text-xs text-ui-danger">La remise ne peut pas dépasser le prix unitaire.</p>}
            <p className="mt-3 text-xs leading-5 text-ui-secondary">
              Prix unitaire après remise : {discountIsValid ? discountedUnitPrice.toLocaleString("fr-FR", { style: "currency", currency: "EUR" }) : "—"} HT. La remise est intégrée au prix enregistré.
            </p>
          </fieldset>

          <div className="flex flex-wrap justify-end gap-2 border-t border-ui-border pt-5">
            <button type="button" onClick={onClose} className="min-h-10 rounded-ui-control border border-ui-border px-4 py-2 text-sm font-semibold text-ui-text hover:bg-ui-subtle focus-visible:outline-2 focus-visible:outline-ui-primary">Annuler</button>
            <button type="submit" disabled={!discountIsValid} className="min-h-10 rounded-ui-control bg-ui-primary px-5 py-2 text-sm font-semibold text-white hover:bg-ui-primary-hover focus-visible:outline-2 focus-visible:outline-ui-primary disabled:cursor-not-allowed disabled:opacity-50">
              {lineItemToModify ? "Enregistrer les modifications" : "Ajouter"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
