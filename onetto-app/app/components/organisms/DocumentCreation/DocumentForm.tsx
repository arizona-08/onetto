import React from "react";
import { Info } from "lucide-react";
import CustomerDetails from "../../molecules/DocumentFormComponents/CustomerDetails";
import ServiceLineItems from "../../molecules/DocumentFormComponents/ServiceLineItems";
import { Client, DepositPlanInput, DocumentDates, ServiceLineItem } from "@/app/types";
import DepositPlanEditor from "../../molecules/DepositPlanEditor";
import {
  DocumentClientError,
  DocumentDateError,
  DocumentLineItemsError,
} from "@/shared/DocumentErrorsTypes";

interface DocumentFormProps {
  client?: Client | null;
  lineItems?: ServiceLineItem[];
  documentDates: DocumentDates;
  onClientChange: (client: Client | null) => void;
  onLineItemsChange: (lineItems: ServiceLineItem[]) => void;
  onDocumentDatesChange: (dates: DocumentDates) => void;
  errors?: {
    documentDateErrors?: DocumentDateError;
    documentClientErrors?: DocumentClientError;
    documentLineItemsErrors?: DocumentLineItemsError;
  };
  lockInvoiceContent?: boolean;
  showPaymentMode?: boolean;
  canUseInstalments?: boolean;
  paymentMode?: "ONE_TIME" | "INSTALMENTS";
  numberOfInstalments?: 2 | 3;
  firstDueDate?: string;
  minFirstDueDate?: string;
  instalments?: Array<{
    sequence: number;
    amountInCents: number;
    dueDate: string;
  }>;
  onPaymentModeChange?: (paymentMode: "ONE_TIME" | "INSTALMENTS") => void;
  onNumberOfInstalmentsChange?: (numberOfInstalments: 2 | 3) => void;
  onFirstDueDateChange?: (firstDueDate: string) => void;
  showDepositPlan?: boolean;
  depositPlan?: DepositPlanInput | null;
  onDepositPlanChange?: (plan: DepositPlanInput | null) => void;
  totalAmountInCents?: number;
  editorLayout?: boolean;
}

function DocumentForm({
  client,
  lineItems,
  documentDates,
  onClientChange,
  onLineItemsChange,
  onDocumentDatesChange,
  errors,
  lockInvoiceContent = false,
  showPaymentMode = false,
  canUseInstalments = false,
  paymentMode = "ONE_TIME",
  numberOfInstalments = 2,
  firstDueDate = "",
  minFirstDueDate,
  instalments = [],
  onPaymentModeChange,
  onNumberOfInstalmentsChange,
  onFirstDueDateChange,
  showDepositPlan = false,
  depositPlan = null,
  onDepositPlanChange,
  totalAmountInCents = 0,
  editorLayout = false,
}: DocumentFormProps) {
  const paymentLimitInformation =
    paymentMode === "INSTALMENTS"
      ? "Par défaut, GoCardless limite chaque échéance à 5 000 €. Demandez un relèvement pour la devise EUR (SEPA) depuis votre tableau de bord GoCardless : Paramètres > Paramètres de la société > Transaction limits > Demander un relèvement. Il n’existe pas de plafond maximal fixe, mais un maximum de 100 000 € est recommandé."
      : "Par défaut, GoCardless limite un paiement unique Open Banking à 1 000 €. Vous pouvez demander un relèvement jusqu’à 15 000 € pour la devise EUR Open Banking (SEPA) depuis votre tableau de bord GoCardless : Paramètres > Paramètres de la société > Transaction limits > Demander un relèvement.";

  return (
    <div className={editorLayout ? "space-y-5" : ""}>
      <CustomerDetails
        client={client}
        onClientChange={onClientChange}
        documentClientErrors={errors?.documentClientErrors}
        disabled={lockInvoiceContent}
        editorLayout={editorLayout}
      />
      <ServiceLineItems
        hydratedLineItems={lineItems}
        hydratedDocumentDates={documentDates}
        onLineItemsChange={onLineItemsChange}
        onDocumentDatesChange={onDocumentDatesChange}
        documentDateErrors={errors?.documentDateErrors}
        documentLineItemsErrors={errors?.documentLineItemsErrors}
        disabled={lockInvoiceContent}
        editorLayout={editorLayout}
      />
      {showDepositPlan && (
        <section className={editorLayout ? "rounded-ui-card border border-ui-border bg-ui-surface p-5 shadow-ui-card" : "mx-auto mt-8 w-full max-w-2xl rounded-lg border border-zinc-200 p-5"}>
          <h2 className="text-lg font-semibold text-zinc-900">Mode de paiement du devis</h2>
          <div className="mt-4 flex flex-wrap gap-3">
            <label className="flex cursor-pointer items-center gap-2 rounded-md border border-zinc-200 px-4 py-3">
              <input type="radio" name="estimatePaymentMode" checked={!depositPlan} onChange={() => onDepositPlanChange?.(null)} />
              <span>Unique</span>
            </label>
            <label className="flex cursor-pointer items-center gap-2 rounded-md border border-zinc-200 px-4 py-3">
              <input type="radio" name="estimatePaymentMode" checked={Boolean(depositPlan)} onChange={() => onDepositPlanChange?.({
                deposits: [{ percentage: 30, triggerCondition: "À l’acceptation du devis" }],
                balanceCondition: "À la livraison",
              })} />
              <span>Acomptes et solde</span>
            </label>
          </div>
          {depositPlan && <DepositPlanEditor value={depositPlan} onChange={(value) => onDepositPlanChange?.(value)} totalAmountInCents={totalAmountInCents} />}
        </section>
      )}
      {showPaymentMode && (
        <section className={editorLayout ? "rounded-ui-card border border-ui-border bg-ui-surface p-5 shadow-ui-card" : "mx-auto mt-8 w-full max-w-2xl rounded-lg border border-zinc-200 p-5"}>
          <div className="flex items-center gap-2">
            <h2 className="font-title text-lg font-semibold text-ui-text">
              Mode de paiement
            </h2>
            <div className="group relative">
              <button
                type="button"
                aria-label="Informations sur les plafonds de paiement GoCardless"
                aria-describedby="gocardless-payment-limit-info"
                className="flex rounded-full p-1 text-ui-secondary transition-colors hover:bg-ui-primary-soft hover:text-ui-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ui-primary"
              >
                <Info className="h-4 w-4" aria-hidden="true" />
              </button>
              <div
                id="gocardless-payment-limit-info"
                role="tooltip"
                className="pointer-events-none absolute left-0 top-8 z-10 w-80 max-w-[calc(100vw-3rem)] rounded-ui-control bg-ui-text px-4 py-3 text-xs font-normal leading-5 text-white opacity-0 shadow-ui-popover transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
              >
                {paymentLimitInformation}
              </div>
            </div>
          </div>
          <p className="mt-1 text-sm text-ui-secondary">
            Choisissez comment votre client réglera cette facture.
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <label className="flex min-h-20 cursor-pointer items-center gap-3 rounded-ui-control border border-ui-border bg-ui-surface px-4 py-3 transition-colors hover:border-ui-primary/50 has-[:checked]:border-ui-primary has-[:checked]:bg-ui-primary-soft focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ui-primary">
              <input
                type="radio"
                name="paymentMode"
                value="ONE_TIME"
                checked={paymentMode === "ONE_TIME"}
                onChange={() => onPaymentModeChange?.("ONE_TIME")}
                className="h-4 w-4 shrink-0 accent-ui-primary"
              />
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-ui-text">Unique</span>
                <span className="mt-0.5 block text-xs leading-5 text-ui-secondary">Un seul règlement</span>
              </span>
            </label>
            <label
              title={
                !canUseInstalments
                  ? "Passer au plan PRO pour activer cette fonctionnalité"
                  : undefined
              }
              className={`flex min-h-20 items-center gap-3 rounded-ui-control border border-ui-border bg-ui-surface px-4 py-3 transition-colors has-[:checked]:border-ui-primary has-[:checked]:bg-ui-primary-soft focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ui-primary ${!canUseInstalments ? "cursor-not-allowed opacity-55" : "cursor-pointer hover:border-ui-primary/50"}`}
            >
              <input
                type="radio"
                name="paymentMode"
                value="INSTALMENTS"
                checked={paymentMode === "INSTALMENTS"}
                disabled={!canUseInstalments}
                onChange={() => onPaymentModeChange?.("INSTALMENTS")}
                className="h-4 w-4 shrink-0 accent-ui-primary"
              />
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-ui-text">Plusieurs fois</span>
                <span className="mt-0.5 block text-xs leading-5 text-ui-secondary">En 2 ou 3 échéances</span>
              </span>
            </label>
          </div>
          {!canUseInstalments && (
            <p className="mt-3 rounded-ui-control border border-ui-border bg-ui-subtle px-4 py-3 text-sm text-ui-secondary">
              Paiement en plusieurs fois — passer au plan PRO pour activer cette
              fonctionnalité.
            </p>
          )}

          {paymentMode === "INSTALMENTS" && (
            <div className="mt-5 space-y-5 border-t border-ui-border pt-5">
              <fieldset>
                <legend className="text-sm font-semibold text-ui-text">Nombre d’échéances</legend>
                <div className="mt-3 flex flex-wrap gap-3">
                  {[2, 3].map((count) => (
                    <label
                      key={count}
                      className="flex min-h-11 cursor-pointer items-center gap-2 rounded-ui-control border border-ui-border bg-ui-surface px-4 py-2 text-sm font-medium text-ui-text transition-colors hover:border-ui-primary/50 has-[:checked]:border-ui-primary has-[:checked]:bg-ui-primary-soft focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ui-primary"
                    >
                      <input
                        type="radio"
                        name="numberOfInstalments"
                        value={count}
                        checked={numberOfInstalments === count}
                        onChange={() =>
                          onNumberOfInstalmentsChange?.(count as 2 | 3)
                        }
                        className="h-4 w-4 accent-ui-primary"
                      />
                      <span>{count} fois</span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <div>
                <label
                  htmlFor="firstDueDate"
                  className="block text-sm font-medium text-ui-text"
                >
                  Première échéance
                </label>
                <input
                  id="firstDueDate"
                  type="date"
                  value={firstDueDate}
                  min={minFirstDueDate}
                  onChange={(event) =>
                    onFirstDueDateChange?.(event.target.value)
                  }
                  className="mt-2 w-full rounded-ui-control border border-ui-control bg-ui-surface px-4 py-2 text-sm text-ui-text shadow-ui-card focus-visible:border-ui-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ui-primary sm:max-w-72"
                  required
                />
              </div>
              <div className="rounded-ui-control border border-ui-border bg-ui-subtle p-4">
                <h3 className="text-sm font-semibold text-ui-text">Échéancier</h3>
                <p className="mt-1 text-sm text-ui-secondary">
                  Les échéances sont prévues chaque semaine.
                </p>
                <ul className="mt-3 divide-y divide-ui-border text-sm text-ui-text">
                  {instalments.map((instalment) => (
                    <li
                      key={instalment.sequence}
                      className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-2.5"
                    >
                      <span className="text-ui-secondary">
                        Échéance {instalment.sequence} ·{" "}
                        {new Intl.DateTimeFormat("fr-FR").format(
                          new Date(`${instalment.dueDate}T12:00:00`),
                        )}
                      </span>
                      <span className="font-semibold text-ui-text">
                        {(instalment.amountInCents / 100).toLocaleString(
                          "fr-FR",
                          { style: "currency", currency: "EUR" },
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}

export default DocumentForm;
