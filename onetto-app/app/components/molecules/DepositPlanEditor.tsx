"use client";

import type { DepositPlanInput } from "@/app/types";

type Props = {
  value: DepositPlanInput;
  onChange: (value: DepositPlanInput) => void;
  totalAmountInCents: number;
};

export default function DepositPlanEditor({ value, onChange, totalAmountInCents }: Props) {
  const depositTotal = value.deposits.reduce((sum, item) => sum + item.percentage, 0);
  const balancePercentage = 100 - depositTotal;
  const depositAmounts = value.deposits.map((item) =>
    Math.floor((totalAmountInCents * item.percentage + 50) / 100),
  );
  const balanceAmount = totalAmountInCents - depositAmounts.reduce((sum, amount) => sum + amount, 0);
  const valid = value.deposits.every((item) =>
    Number.isInteger(item.percentage) && item.percentage >= 20 && item.percentage % 5 === 0 && item.triggerCondition.trim(),
  ) && balancePercentage >= 5 && balancePercentage % 5 === 0 && value.balanceCondition.trim();
  const euros = (cents: number) => (cents / 100).toLocaleString("fr-FR", {
    style: "currency", currency: "EUR",
  });

  function updateDeposit(index: number, patch: Partial<DepositPlanInput["deposits"][number]>) {
    onChange({
      ...value,
      deposits: value.deposits.map((deposit, i) => i === index ? { ...deposit, ...patch } : deposit),
    });
  }

  return (
    <div className="mt-4 space-y-4 rounded-lg border border-zinc-200 bg-zinc-50 p-4">
      <label className="block text-sm font-medium text-zinc-800" htmlFor="deposit-count">
        Nombre d’acomptes
      </label>
      <select
        id="deposit-count"
        value={value.deposits.length}
        onChange={(event) => onChange({
          ...value,
          deposits: event.target.value === "2"
            ? [value.deposits[0], value.deposits[1] ?? { percentage: 25, triggerCondition: "Après la première phase des travaux" }]
            : [value.deposits[0]],
        })}
        className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm"
      >
        <option value="1">1 acompte + solde</option>
        <option value="2">2 acomptes + solde</option>
      </select>

      {value.deposits.map((deposit, index) => (
        <div key={index} className="grid gap-3 rounded-md border border-zinc-200 bg-white p-4 sm:grid-cols-[135px_1fr]">
          <div>
            <label htmlFor={`deposit-percent-${index}`} className="text-sm font-medium text-zinc-800">
              {index + 1}{index === 0 ? "er" : "e"} acompte (%)
            </label>
            <input
              id={`deposit-percent-${index}`}
              type="number"
              min={20}
              max={value.deposits.length === 2 ? 95 - value.deposits[1 - index].percentage : 95}
              step={5}
              value={deposit.percentage}
              onChange={(event) => updateDeposit(index, { percentage: Number(event.target.value) })}
              className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
            />
            <p className="mt-1 text-xs text-zinc-500">{euros(depositAmounts[index])}</p>
          </div>
          <div>
            <label htmlFor={`deposit-condition-${index}`} className="text-sm font-medium text-zinc-800">
              Condition de déclenchement
            </label>
            <input
              id={`deposit-condition-${index}`}
              maxLength={500}
              value={deposit.triggerCondition}
              onChange={(event) => updateDeposit(index, { triggerCondition: event.target.value })}
              className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
            />
          </div>
        </div>
      ))}

      <div className="grid gap-3 rounded-md border border-zinc-200 bg-white p-4 sm:grid-cols-[135px_1fr]">
        <div>
          <p className="text-sm font-medium text-zinc-800">Solde (%)</p>
          <p className="mt-1 text-lg font-semibold text-primary">{balancePercentage} %</p>
          <p className="text-xs text-zinc-500">{euros(balanceAmount)}</p>
        </div>
        <div>
          <label htmlFor="balance-condition" className="text-sm font-medium text-zinc-800">Condition de déclenchement</label>
          <input
            id="balance-condition"
            maxLength={500}
            value={value.balanceCondition}
            onChange={(event) => onChange({ ...value, balanceCondition: event.target.value })}
            className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
          />
        </div>
      </div>
      {!valid && <p role="alert" className="text-sm text-red-600">Chaque acompte doit être un multiple de 5 % d’au moins 20 %, le solde doit être d’au moins 5 %, et chaque étape doit avoir une condition.</p>}
      <p className="text-xs text-zinc-500">Les conditions décrivent les jalons du contrat. Aucun prélèvement n’est automatique.</p>
    </div>
  );
}
