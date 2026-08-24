import type { Document } from '@/app/types';
import { formatCurrency, formatDate } from '@/shared/utils';

interface InvoiceInstalmentProgressProps {
  document: Document;
  className?: string;
}

export default function InvoiceInstalmentProgress({
  document,
  className = '',
}: InvoiceInstalmentProgressProps) {
  if (
    document.invoicePaymentMode?.paymentMode !== 'INSTALMENTS'
    || !document.invoiceInstalmentPlan
  ) {
    return null;
  }

  const instalments = document.invoiceInstalmentPlan.invoicePaymentInstalments;

  if (instalments.length === 0) {
    return null;
  }

  const paidInstalments = instalments.filter(
    (instalment) => instalment.instalmentStatus === 'SUCCESS',
  ).length;

  return (
    <div className={className}>
      <div
        className="flex h-2 w-full gap-px overflow-visible rounded-full bg-zinc-100"
        aria-label={`${paidInstalments} échéance${paidInstalments > 1 ? 's' : ''} réglée${paidInstalments > 1 ? 's' : ''} sur ${instalments.length}`}
      >
        {instalments.map((instalment) => {
          const isPaid = instalment.instalmentStatus === 'SUCCESS';
          const dueDate = formatDate(instalment.dueDate);

          return (
            <span
              key={instalment.instalmentNumber}
              tabIndex={0}
              role="img"
              aria-label={`Échéance ${instalment.instalmentNumber} : ${formatCurrency(instalment.amountInCents / 100)}, prélèvement le ${dueDate}${isPaid ? ', réglée' : ''}`}
              className="group relative min-w-0 flex-1 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              <span
                className={`block h-full w-full rounded-full ${
                  isPaid ? 'bg-emerald-500' : 'bg-zinc-200'
                }`}
              />
              <span
                role="tooltip"
                className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 w-max max-w-52 -translate-x-1/2 rounded-lg bg-zinc-900 px-3 py-2 text-xs leading-5 text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus:opacity-100"
              >
                <span className="block font-semibold">Échéance {instalment.instalmentNumber}</span>
                <span className="block">{formatCurrency(instalment.amountInCents / 100)}</span>
                <span className="block">Prélèvement le {dueDate}</span>
                {isPaid && <span className="block text-emerald-300">Réglée</span>}
              </span>
            </span>
          );
        })}
      </div>
    </div>
  );
}
