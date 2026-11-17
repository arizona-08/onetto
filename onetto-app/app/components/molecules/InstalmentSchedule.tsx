import { formatCurrency, formatDate } from "@/shared/utils";

type Instalment = {
  instalmentNumber: number;
  amountInCents: number;
  dueDate: string;
  instalmentStatus?:
    "PENDING" | "PAYMENT_IN_PROGRESS" | "SUCCESS" | "FAILED" | "OVERDUE";
};

const statusLabels: Record<
  NonNullable<Instalment["instalmentStatus"]>,
  string
> = {
  PENDING: "À venir",
  PAYMENT_IN_PROGRESS: "En cours",
  SUCCESS: "Réglée",
  FAILED: "Échouée",
  OVERDUE: "En retard",
};

export default function InstalmentSchedule({
  instalments,
  showStatus = false,
  className = "",
}: {
  instalments: Instalment[];
  showStatus?: boolean;
  className?: string;
}) {
  if (instalments.length === 0) return null;

  return (
    <section
      className={`rounded-ui-control border border-ui-border bg-ui-subtle p-4 sm:p-5 ${className}`}
    >
      <h2 className="font-title text-sm font-semibold text-ui-text">
        Échéancier des prélèvements
      </h2>
      <div className="mt-3 divide-y divide-ui-border text-sm">
        {instalments.map((instalment) => (
          <div
            key={instalment.instalmentNumber}
            className={`grid gap-1 py-3 first:pt-0 last:pb-0 sm:items-center sm:gap-4 ${
              showStatus
                ? "sm:grid-cols-[minmax(7rem,1fr)_minmax(10rem,1.4fr)_auto_auto]"
                : "sm:grid-cols-[minmax(7rem,1fr)_minmax(10rem,1.4fr)_auto]"
            }`}
          >
            <span className="font-semibold text-ui-text">
              Échéance {instalment.instalmentNumber}
            </span>
            <span className="text-ui-secondary">
              Prélèvement prévu le {formatDate(instalment.dueDate)}
            </span>
            <span className="font-semibold tabular-nums text-ui-text">
              {formatCurrency(instalment.amountInCents / 100)}
            </span>
            {showStatus && instalment.instalmentStatus && (
              <span className="text-ui-secondary">
                {statusLabels[instalment.instalmentStatus]}
              </span>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
