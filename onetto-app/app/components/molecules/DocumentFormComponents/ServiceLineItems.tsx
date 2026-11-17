import { DocumentDates, ServiceLineItem } from "@/app/types";
import { Edit, Plus, Trash2 } from "lucide-react";
import React from "react";
import AddLineItemModal from "./AddLineItemModal";
import {
  DocumentDateError,
  DocumentLineItemsError,
} from "@/shared/DocumentErrorsTypes";

interface ServiceLineItemsProps {
  hydratedLineItems?: ServiceLineItem[];
  hydratedDocumentDates: DocumentDates;
  onLineItemsChange: (lineItems: ServiceLineItem[]) => void;
  onDocumentDatesChange: (dates: DocumentDates) => void;
  documentDateErrors?: DocumentDateError;
  documentLineItemsErrors?: DocumentLineItemsError;
  disabled?: boolean;
  editorLayout?: boolean;
}
function ServiceLineItems({
  hydratedLineItems,
  hydratedDocumentDates,
  onLineItemsChange,
  onDocumentDatesChange,
  documentDateErrors,
  documentLineItemsErrors,
  disabled = false,
  editorLayout = false,
}: ServiceLineItemsProps) {
  const lineItems = hydratedLineItems ?? [];

  const [isModalVisible, setIsModalVisible] = React.useState(false);

  function handleDocumentDatesChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    onDocumentDatesChange({ ...hydratedDocumentDates, [name]: value });
  }

  const [lineItemToModify, setLineItemToModify] = React.useState<{
    item: ServiceLineItem | null;
    index: number | null;
  } | null>(null);

  function handleOnCloseModal() {
    setIsModalVisible(false);
    setLineItemToModify(null);
  }

  function handleOnAddLineItem(lineItem: ServiceLineItem) {
    setIsModalVisible(false);
    onLineItemsChange([...lineItems, lineItem]);
  }

  function handleOnEditLineItem(lineItem: ServiceLineItem, index: number) {
    const newLineItems = [...lineItems];
    newLineItems[index] = lineItem;
    onLineItemsChange(newLineItems);

    setLineItemToModify(null);
    setIsModalVisible(false);
  }

  function deleteLineItem(index: number) {
    const newLineItems = [...lineItems];
    newLineItems.splice(index, 1);
    onLineItemsChange(newLineItems);
  }

  function updateLineItem(
    index: number,
    field: "quantity" | "unitPrice" | "taxRate",
    value: string,
  ) {
    onLineItemsChange(lineItems.map((item, itemIndex) =>
      itemIndex === index ? { ...item, [field]: Number(value) } : item,
    ));
  }

  function renderQuickInput(
    lineItem: ServiceLineItem,
    index: number,
    field: "quantity" | "unitPrice" | "taxRate",
    fullWidth = false,
  ) {
    const labels = {
      quantity: `Quantité de la ligne ${index + 1}`,
      unitPrice: `Prix unitaire hors taxe de la ligne ${index + 1} en euros`,
      taxRate: `TVA de la ligne ${index + 1} en pourcentage`,
    };
    const widths = { quantity: "w-11", unitPrice: "w-16", taxRate: "w-11" };

    return (
      <input
        type="number"
        inputMode={field === "quantity" ? "numeric" : "decimal"}
        min={field === "quantity" ? 1 : 0}
        max={field === "taxRate" ? 100 : undefined}
        step={field === "quantity" ? 1 : "0.01"}
        value={lineItem[field]}
        disabled={disabled}
        onChange={(event) => updateLineItem(index, field, event.target.value)}
        aria-label={labels[field]}
        className={`quick-line-input ${fullWidth ? "w-full" : widths[field]} rounded-ui-control border border-ui-control bg-ui-surface text-center text-sm text-ui-text focus-visible:outline-2 focus-visible:outline-ui-primary disabled:opacity-50`}
      />
    );
  }

  function renderActions(lineItem: ServiceLineItem, index: number) {
    return (
      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          disabled={disabled}
          aria-label={`Modifier tous les détails de la ligne ${index + 1}`}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-ui-primary hover:bg-ui-primary-soft focus-visible:outline-2 focus-visible:outline-ui-primary disabled:opacity-50"
          onClick={() => {
            setLineItemToModify({ item: lineItem, index });
            setIsModalVisible(true);
          }}
        >
          <Edit size={16} aria-hidden="true" />
        </button>
        <button
          type="button"
          disabled={disabled}
          aria-label={`Supprimer la ligne ${index + 1}`}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-ui-danger hover:bg-ui-danger-soft focus-visible:outline-2 focus-visible:outline-ui-danger disabled:opacity-50"
          onClick={() => deleteLineItem(index)}
        >
          <Trash2 size={16} aria-hidden="true" />
        </button>
      </div>
    );
  }

  return (
    <>
      <AddLineItemModal
        isVisible={!disabled && isModalVisible}
        onClose={handleOnCloseModal}
        onAddLineItem={handleOnAddLineItem}
        lineItemToModify={lineItemToModify}
        onEditLineItem={handleOnEditLineItem}
      />
      <div className={editorLayout ? "rounded-ui-card border border-ui-border bg-ui-surface p-5 shadow-ui-card" : "mb-6 rounded-md border border-gray-200 p-4"}>
        <div
          className={disabled ? "opacity-50 pointer-events-none" : undefined}
        >
          <header className={`flex flex-col items-center md:flex-row md:justify-between ${editorLayout ? "mb-5" : "mb-10"}`}>
            <div className="flex items-center gap-4 w-full md:w-fit">
              <div className={editorLayout ? "flex h-9 w-9 items-center justify-center rounded-ui-control bg-ui-primary-soft font-title font-semibold text-ui-primary" : "flex h-10 w-10 items-center justify-center rounded-full bg-primary font-title font-semibold text-white"}>
                <span>02</span>
              </div>
              <h2 className="text-lg font-title font-semibold mb-1">
                {editorLayout ? "Articles" : "Détails du service"}
              </h2>
            </div>

            <div className="mt-2 md:mt-0">
              <button
                disabled={disabled}
                className="flex items-center gap-2 text-sm text-primary font-medium hover:text-primary-hover transition-colors"
                onClick={() => {
                  setLineItemToModify(null);
                  setIsModalVisible(true);
                }}
              >
                <Plus size={16} />
                <span>{editorLayout ? "Ajouter une ligne" : "Ajouter un service"}</span>
              </button>
            </div>
          </header>

          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[680px] table-fixed border-collapse text-left text-xs text-ui-text">
              <colgroup>
                <col className="w-[25%]" />
                <col className="w-[10%]" />
                <col className="w-[18%]" />
                <col className="w-[10%]" />
                <col className="w-[13%]" />
                <col className="w-[13%]" />
                <col className="w-[11%]" />
              </colgroup>
              <thead className="border-b border-ui-border text-ui-secondary">
                <tr>
                  {["Description", "Quantité", "Prix unitaire", "TVA", "Total HT", "Total TTC", "Actions"].map((label) => (
                    <th key={label} scope="col" className="px-1.5 pb-3 font-semibold whitespace-nowrap">{label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {lineItems.map((lineItem, index) => {
                  const totalHT = lineItem.unitPrice * lineItem.quantity;
                  const totalTTC = totalHT + totalHT * (lineItem.taxRate / 100);
                  return (
                    <tr key={index} className="border-b border-ui-border align-middle">
                      <td className="break-words px-1.5 py-3 font-semibold">{lineItem.description}</td>
                      <td className="px-1.5 py-3">{renderQuickInput(lineItem, index, "quantity")}</td>
                      <td className="px-1.5 py-3">
                        <div className="flex items-center gap-1">
                          {renderQuickInput(lineItem, index, "unitPrice")}
                          <span className="min-w-0 break-words text-[11px] leading-tight text-ui-secondary">€ / {lineItem.unit}</span>
                        </div>
                      </td>
                      <td className="px-1.5 py-3">
                        <div className="flex items-center gap-1">
                          {renderQuickInput(lineItem, index, "taxRate")}
                          <span className="text-ui-secondary">%</span>
                        </div>
                      </td>
                      <td className="px-1.5 py-3 whitespace-nowrap">{totalHT} €</td>
                      <td className="px-1.5 py-3 font-semibold whitespace-nowrap">{totalTTC} €</td>
                      <td className="px-1.5 py-3">{renderActions(lineItem, index)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="space-y-4 md:hidden">
            {lineItems.map((lineItem, index) => {
              const totalHT = lineItem.unitPrice * lineItem.quantity;
              const totalTTC = totalHT + totalHT * (lineItem.taxRate / 100);
              return (
                <article key={index} className="rounded-ui-control border border-ui-border bg-ui-surface p-4">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="min-w-0 break-words text-sm font-semibold text-ui-text">{lineItem.description}</h3>
                    {renderActions(lineItem, index)}
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
                    <label className="min-w-0 text-xs font-medium text-ui-secondary">
                      Quantité
                      <span className="mt-1.5 block">{renderQuickInput(lineItem, index, "quantity", true)}</span>
                    </label>
                    <label className="min-w-0 text-xs font-medium text-ui-secondary">
                      Prix unitaire HT (€)
                      <span className="mt-1.5 block">{renderQuickInput(lineItem, index, "unitPrice", true)}</span>
                    </label>
                    <label className="min-w-0 text-xs font-medium text-ui-secondary">
                      TVA (%)
                      <span className="mt-1.5 block">{renderQuickInput(lineItem, index, "taxRate", true)}</span>
                    </label>
                  </div>
                  <div className="mt-3 text-xs text-ui-secondary">Unité : {lineItem.unit || "—"}</div>
                  <div className="mt-4 flex flex-wrap justify-between gap-x-4 gap-y-2 border-t border-ui-border pt-3 text-xs">
                    <span className="text-ui-secondary">Total HT <strong className="ml-1 text-ui-text">{totalHT} €</strong></span>
                    <span className="text-ui-secondary">Total TTC <strong className="ml-1 text-ui-text">{totalTTC} €</strong></span>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
        <div className={editorLayout ? "mt-5 flex justify-end pt-5" : "mt-10 flex justify-end gap-4"}>
          <div className={editorLayout ? "flex w-full max-w-64 flex-col rounded-ui-control bg-ui-subtle p-4" : "bg-primary/10 p-5 rounded-md flex flex-col items-center gap-5 w-full max-w-100 mx-auto md:mx-0"}>
            <div className="flex flex-col gap-2 w-full">
              <label htmlFor="document-due-date" className="uppercase text-xs font-semibold tracking-wide text-primary/80">
                Date d&apos;échéance
              </label>
              <input
                type="date"
                name="dueDate"
                id="document-due-date"
                value={hydratedDocumentDates.dueDate.slice(0, 10)}
                onChange={handleDocumentDatesChange}
                className={editorLayout ? "rounded-ui-control border border-ui-control bg-ui-surface p-2 text-sm font-medium text-ui-text focus:outline-none focus:ring-2 focus:ring-ui-primary" : "bg-primary/20 rounded-md p-2 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-opacity-50"}
              />
              {documentDateErrors && documentDateErrors.dueDate && (
                <ul>
                  {documentDateErrors.dueDate.map((error, index) => (
                    <li key={index}>
                      <span className="text-red-500">
                        {error}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
        {documentLineItemsErrors && documentLineItemsErrors.general && (
          <ul>
            {documentLineItemsErrors.general.map((error, index) => (
              <li key={index}>
                <span className="text-red-500">
                  {error}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}

export default ServiceLineItems;
