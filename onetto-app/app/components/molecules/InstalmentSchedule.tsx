import { formatCurrency, formatDate } from '@/shared/utils';

type Instalment = {
  instalmentNumber: number;
  amountInCents: number;
  dueDate: string;
  instalmentStatus?: 'PENDING' | 'PAYMENT_IN_PROGRESS' | 'SUCCESS' | 'FAILED' | 'OVERDUE';
};

const statusLabels: Record<NonNullable<Instalment['instalmentStatus']>, string> = {
  PENDING: 'À venir',
  PAYMENT_IN_PROGRESS: 'En cours',
  SUCCESS: 'Réglée',
  FAILED: 'Échouée',
  OVERDUE: 'En retard',
};

export default function InstalmentSchedule({
  instalments,
  showStatus = false,
  className = '',
}: {
  instalments: Instalment[];
  showStatus?: boolean;
  className?: string;
}) {
  if (instalments.length === 0) return null;

  return (
    <section className={`rounded-xl border border-zinc-200 bg-zinc-50 p-4 ${className}`}>
      <h2 className="font-semibold text-zinc-900">Échéancier des prélèvements</h2>
      <div className="mt-3 space-y-2 text-sm">
        {instalments.map((instalment) => (
          <div
            key={instalment.instalmentNumber}
            className={`grid gap-1 border-t border-zinc-200 pt-2 sm:items-center sm:gap-4 ${
              showStatus
                ? 'sm:grid-cols-[minmax(7rem,1fr)_minmax(10rem,1.4fr)_auto_auto]'
                : 'sm:grid-cols-[minmax(7rem,1fr)_minmax(10rem,1.4fr)_auto]'
            }`}
          >
            <span className="font-medium text-zinc-800">Échéance {instalment.instalmentNumber}</span>
            <span className="text-zinc-600">Prélèvement prévu le {formatDate(instalment.dueDate)}</span>
            <span className="font-semibold text-zinc-900">{formatCurrency(instalment.amountInCents / 100)}</span>
            {showStatus && instalment.instalmentStatus && (
              <span className="text-zinc-600">{statusLabels[instalment.instalmentStatus]}</span>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
