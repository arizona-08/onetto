import type { DepositPlanInput } from "@/app/types";
import DepositPlanEditor from "../../molecules/DepositPlanEditor";
import InstalmentSettings from "./InstalmentSettings";

type EstimatePaymentSectionProps = {
  depositPlan: DepositPlanInput | null;
  onDepositPlanChange?: (plan: DepositPlanInput | null) => void;
  totalAmountInCents: number;
  canUseInstalments: boolean;
  paymentMode: "ONE_TIME" | "INSTALMENTS";
  onPaymentModeChange?: (mode: "ONE_TIME" | "INSTALMENTS") => void;
  numberOfInstalments: 2 | 3;
  onNumberOfInstalmentsChange?: (count: 2 | 3) => void;
  firstDueDate: string;
  minFirstDueDate?: string;
  onFirstDueDateChange?: (date: string) => void;
  instalments: Array<{ sequence: number; amountInCents: number; dueDate: string }>;
  editorLayout: boolean;
};

const initialDepositPlan: DepositPlanInput = {
  deposits: [{ percentage: 30, triggerCondition: "À l’acceptation du devis" }],
  balanceCondition: "À la livraison",
};

export default function EstimatePaymentSection({
  depositPlan,
  onDepositPlanChange,
  totalAmountInCents,
  canUseInstalments,
  paymentMode,
  onPaymentModeChange,
  numberOfInstalments,
  onNumberOfInstalmentsChange,
  firstDueDate,
  minFirstDueDate,
  onFirstDueDateChange,
  instalments,
  editorLayout,
}: EstimatePaymentSectionProps) {
  const selected = depositPlan ? "DEPOSITS" : paymentMode;
  const choices = [
    { value: "ONE_TIME", title: "Unique", description: "Un seul règlement" },
    { value: "INSTALMENTS", title: "Plusieurs fois", description: "En 2 ou 3 échéances" },
    { value: "DEPOSITS", title: "Acomptes et solde", description: "Selon les étapes du projet" },
  ] as const;

  function selectMode(mode: (typeof choices)[number]["value"]) {
    if (mode === "DEPOSITS") {
      onPaymentModeChange?.("ONE_TIME");
      onDepositPlanChange?.(initialDepositPlan);
    } else {
      onDepositPlanChange?.(null);
      onPaymentModeChange?.(mode);
    }
  }

  return (
    <section className={editorLayout
      ? "rounded-ui-card border border-ui-border bg-ui-surface p-5 shadow-ui-card"
      : "mx-auto mt-8 w-full max-w-2xl rounded-ui-card border border-ui-border bg-ui-surface p-5 shadow-ui-card"
    }>
      <h2 className="font-title text-lg font-semibold text-ui-text">Mode de paiement du devis</h2>
      <p className="mt-1 text-sm text-ui-secondary">
        Précisez les conditions de règlement proposées à votre client.
      </p>
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        {choices.map((choice) => {
          const disabled = choice.value === "INSTALMENTS" && !canUseInstalments;
          return (
            <label
              key={choice.value}
              title={disabled ? "Passer au plan PRO pour activer cette fonctionnalité" : undefined}
              className={`flex min-h-20 items-start gap-2.5 rounded-ui-control border border-ui-border bg-ui-surface px-3 py-3 transition-colors has-[:checked]:border-ui-primary has-[:checked]:bg-ui-primary-soft focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ui-primary ${disabled ? "cursor-not-allowed opacity-55" : "cursor-pointer hover:border-ui-primary/50"}`}
            >
              <input
                type="radio"
                name="estimatePaymentMode"
                value={choice.value}
                checked={selected === choice.value}
                disabled={disabled}
                onChange={() => selectMode(choice.value)}
                className="mt-0.5 h-4 w-4 shrink-0 accent-ui-primary"
              />
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-ui-text">{choice.title}</span>
                <span className="mt-1 block text-xs leading-4 text-ui-secondary">{choice.description}</span>
              </span>
            </label>
          );
        })}
      </div>
      {!canUseInstalments && (
        <p className="mt-3 rounded-ui-control border border-ui-border bg-ui-subtle px-4 py-3 text-sm text-ui-secondary">
          Paiement en plusieurs fois — passer au plan PRO pour activer cette fonctionnalité.
        </p>
      )}
      {selected === "INSTALMENTS" && (
        <>
          <InstalmentSettings
            numberOfInstalments={numberOfInstalments}
            onNumberOfInstalmentsChange={onNumberOfInstalmentsChange}
            firstDueDate={firstDueDate}
            minFirstDueDate={minFirstDueDate}
            onFirstDueDateChange={onFirstDueDateChange}
            instalments={instalments}
          />
          <p className="mt-3 text-xs leading-5 text-ui-secondary">
            La première date pourra être ajustée sur la facture avant son envoi.
          </p>
        </>
      )}
      {depositPlan && (
        <DepositPlanEditor
          value={depositPlan}
          onChange={(value) => onDepositPlanChange?.(value)}
          totalAmountInCents={totalAmountInCents}
        />
      )}
    </section>
  );
}
