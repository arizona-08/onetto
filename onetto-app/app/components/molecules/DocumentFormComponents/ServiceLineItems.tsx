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

          <div className="overflow-x-auto">
            <table className={`w-full border-collapse text-left ${editorLayout ? "min-w-[790px]" : "min-w-140"}`}>
              <thead className="border-b border-gray-200  text-sm text-gray-500">
                <tr className="">
                  <th className="min-w-[210px] px-3 pb-5 font-semibold font-title tracking-wide">
                    Description
                  </th>
                  <th className="min-w-[80px] px-3 pb-5 font-semibold font-title tracking-wide whitespace-nowrap">
                    Quantité
                  </th>
                  <th className="min-w-[160px] px-3 pb-5 font-semibold font-title tracking-wide whitespace-nowrap">
                    Prix unitaire
                  </th>
                  <th className="min-w-[85px] px-3 pb-5 font-semibold font-title tracking-wide">
                    TVA
                  </th>
                  <th className="min-w-[95px] px-3 pb-5 font-semibold font-title tracking-wide whitespace-nowrap">
                    Total HT
                  </th>
                  <th className="min-w-[95px] px-3 pb-5 font-semibold font-title tracking-wide whitespace-nowrap">
                    Total TTC
                  </th>
                  <th className="min-w-[65px] px-3 pb-5 font-semibold font-title tracking-wide">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {lineItems.map((lineItem, index) => {
                  const totalHT = lineItem.unitPrice * lineItem.quantity;
                  const totalTTC = totalHT + totalHT * (lineItem.taxRate / 100);
                  return (
                    <tr key={index}>
                      <td className="border-b border-gray-200 px-3 py-4 font-semibold">
                        {lineItem.description}
                      </td>
                      <td className="border-b border-gray-200 px-3 py-4">
                        <input
                          type="number"
                          inputMode="numeric"
                          min={1}
                          step={1}
                          value={lineItem.quantity}
                          disabled={disabled}
                          onChange={(event) => updateLineItem(index, "quantity", event.target.value)}
                          aria-label={`Quantité de la ligne ${index + 1}`}
                          className="quick-line-input w-12 rounded-ui-control border border-ui-control bg-ui-surface text-center text-sm text-ui-text focus-visible:outline-2 focus-visible:outline-ui-primary disabled:opacity-50"
                        />
                      </td>
                      <td className="border-b border-gray-200 px-3 py-4">
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            inputMode="decimal"
                            min={0}
                            step="0.01"
                            value={lineItem.unitPrice}
                            disabled={disabled}
                            onChange={(event) => updateLineItem(index, "unitPrice", event.target.value)}
                            aria-label={`Prix unitaire hors taxe de la ligne ${index + 1} en euros`}
                            className="quick-line-input w-20 shrink-0 rounded-ui-control border border-ui-control bg-ui-surface text-center text-sm text-ui-text focus-visible:outline-2 focus-visible:outline-ui-primary disabled:opacity-50"
                          />
                          <span className="text-xs leading-tight text-ui-secondary">€ / {lineItem.unit}</span>
                        </div>
                      </td>
                      <td className="border-b border-gray-200 px-3 py-4">
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            inputMode="decimal"
                            min={0}
                            max={100}
                            step="0.01"
                            value={lineItem.taxRate}
                            disabled={disabled}
                            onChange={(event) => updateLineItem(index, "taxRate", event.target.value)}
                            aria-label={`TVA de la ligne ${index + 1} en pourcentage`}
                            className="quick-line-input w-12 shrink-0 rounded-ui-control border border-ui-control bg-ui-surface text-center text-sm text-ui-text focus-visible:outline-2 focus-visible:outline-ui-primary disabled:opacity-50"
                          />
                          <span className="text-xs text-ui-secondary">%</span>
                        </div>
                      </td>
                      <td className="border-b border-gray-200 px-3 py-4 whitespace-nowrap">
                        {totalHT} €
                      </td>
                      <td className="border-b border-gray-200 px-3 py-4 font-semibold whitespace-nowrap">
                        {totalTTC} €
                      </td>
                      <td className="border-b border-gray-200 px-3 py-4 whitespace-nowrap">
                        <button
                          type="button"
                          disabled={disabled}
                          aria-label={`Modifier tous les détails de la ligne ${index + 1}`}
                          className="text-primary hover:text-primary-hover"
                          onClick={() => {
                            setLineItemToModify({ item: lineItem, index });
                            setIsModalVisible(true);
                          }}
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          type="button"
                          disabled={disabled}
                          aria-label={`Supprimer la ligne ${index + 1}`}
                          className="text-danger hover:text-danger-hover ml-2"
                          onClick={() => deleteLineItem(index)}
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
        <div className={editorLayout ? "mt-5 flex justify-end border-t border-ui-border pt-5" : "mt-10 flex justify-end gap-4"}>
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
