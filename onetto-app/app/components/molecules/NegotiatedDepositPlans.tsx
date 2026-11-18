import type { Document, DocumentNegociation } from "@/app/types";
import { formatCurrency } from "@/shared/utils";

export type DepositPlanChoice = "ORIGINAL" | "CLIENT";

type Stage = NonNullable<NonNullable<Document["contractPaymentPlan"]>["stages"]>[number];
type ProposedStage = NonNullable<DocumentNegociation["proposedPaymentStages"]>[number];

type NegotiatedDepositPlansProps = {
  originalStages: Stage[];
  proposedStages: ProposedStage[];
  selected: DepositPlanChoice | null;
  onSelect: (choice: DepositPlanChoice) => void;
};

export default function NegotiatedDepositPlans({
  originalStages,
  proposedStages,
  selected,
  onSelect,
}: NegotiatedDepositPlansProps) {
  return (
    <div className="mt-4">
      <p className="text-sm text-ui-secondary">
        Le client propose un autre découpage des acomptes. Choisissez le plan à reprendre dans le nouveau brouillon.
      </p>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <DepositPlanOption
          title="Acomptes proposés"
          choice="ORIGINAL"
          stages={originalStages}
          selected={selected === "ORIGINAL"}
          onSelect={onSelect}
        />
        <DepositPlanOption
          title="Acomptes révisés par le client"
          choice="CLIENT"
          stages={proposedStages}
          selected={selected === "CLIENT"}
          onSelect={onSelect}
        />
      </div>
      <p className="mt-3 text-xs text-ui-secondary">
        Ce choix reste modifiable dans le brouillon. Seul l’envoi du nouveau devis le présente au client.
      </p>
    </div>
  );
}

function DepositPlanOption({
  title,
  choice,
  stages,
  selected,
  onSelect,
}: {
  title: string;
  choice: DepositPlanChoice;
  stages: Array<Stage | ProposedStage>;
  selected: boolean;
  onSelect: (choice: DepositPlanChoice) => void;
}) {
  return (
    <section className={`rounded-ui-card border bg-ui-surface p-4 shadow-ui-card ${selected ? "border-ui-primary" : "border-ui-border"}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-title text-base font-semibold text-ui-text">{title}</h3>
        <button
          type="button"
          onClick={() => onSelect(choice)}
          aria-pressed={selected}
          className={`min-h-9 rounded-ui-control px-3 py-1.5 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ui-primary ${selected ? "bg-ui-primary-soft text-ui-primary" : "border border-ui-border text-ui-primary hover:bg-ui-primary-soft"}`}
        >
          {selected ? "Choisi" : "Choisir"}
        </button>
      </div>
      <ol className="mt-3 divide-y divide-ui-border">
        {stages.map((stage) => (
          <li key={`${stage.kind}-${stage.sequence}`} className="flex items-start gap-3 py-3 text-sm">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-ui-primary text-ui-primary" aria-hidden="true">
              <span className="h-1.5 w-1.5 rounded-full bg-current" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-ui-text">
                {stage.kind === "BALANCE" ? "Solde" : `Acompte ${stage.sequence}`} · {stage.percentage} %
              </p>
              <p className="mt-0.5 text-xs leading-5 text-ui-secondary">{stage.triggerCondition}</p>
            </div>
            <p className="shrink-0 text-right font-semibold text-ui-text">
              {formatCurrency(stage.amountInCents / 100)}
            </p>
          </li>
        ))}
      </ol>
    </section>
  );
}
