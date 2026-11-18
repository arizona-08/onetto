type Instalment = {
  sequence: number;
  amountInCents: number;
  dueDate: string;
};

type InstalmentSettingsProps = {
  numberOfInstalments: 2 | 3;
  firstDueDate: string;
  minFirstDueDate?: string;
  instalments: Instalment[];
  onNumberOfInstalmentsChange?: (count: 2 | 3) => void;
  onFirstDueDateChange?: (date: string) => void;
};

export default function InstalmentSettings({
  numberOfInstalments,
  firstDueDate,
  minFirstDueDate,
  instalments,
  onNumberOfInstalmentsChange,
  onFirstDueDateChange,
}: InstalmentSettingsProps) {
  return (
    <div className="mt-5 space-y-5 border-t border-ui-border pt-5">
      <fieldset>
        <legend className="text-sm font-semibold text-ui-text">Nombre d’échéances</legend>
        <div className="mt-3 flex flex-wrap gap-3">
          {([2, 3] as const).map((count) => (
            <label
              key={count}
              className="flex min-h-11 cursor-pointer items-center gap-2 rounded-ui-control border border-ui-border bg-ui-surface px-4 py-2 text-sm font-medium text-ui-text transition-colors hover:border-ui-primary/50 has-[:checked]:border-ui-primary has-[:checked]:bg-ui-primary-soft focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ui-primary"
            >
              <input
                type="radio"
                name="numberOfInstalments"
                value={count}
                checked={numberOfInstalments === count}
                onChange={() => onNumberOfInstalmentsChange?.(count)}
                className="h-4 w-4 accent-ui-primary"
              />
              <span>{count} fois</span>
            </label>
          ))}
        </div>
      </fieldset>
      <div>
        <label htmlFor="firstDueDate" className="block text-sm font-medium text-ui-text">
          Première échéance
        </label>
        <input
          id="firstDueDate"
          type="date"
          value={firstDueDate}
          min={minFirstDueDate}
          onChange={(event) => onFirstDueDateChange?.(event.target.value)}
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
                {(instalment.amountInCents / 100).toLocaleString("fr-FR", {
                  style: "currency",
                  currency: "EUR",
                })}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
