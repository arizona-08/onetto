'use client';

import type { Document } from '@/app/types';
import {
  getInstalmentRetryCapability,
  retryInstalmentPayment,
  type InstalmentRetryCapability,
} from '@/lib/documents/document';
import { formatCurrency, formatDate } from '@/shared/utils';
import { AlertTriangle, CalendarClock, RotateCcw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

interface InvoiceInstalmentProgressProps {
  document: Document;
  className?: string;
}

export default function InvoiceInstalmentProgress({
  document,
  className = '',
}: InvoiceInstalmentProgressProps) {
  const router = useRouter();
  const [capabilities, setCapabilities] = useState<
    Record<number, InstalmentRetryCapability>
  >({});
  const [retryingNumber, setRetryingNumber] = useState<number | null>(null);
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
  const retryableInstalments = instalments.filter((instalment) =>
    ['FAILED', 'OVERDUE'].includes(instalment.instalmentStatus),
  );
  const retryableInstalmentKey = retryableInstalments
    .map((instalment) => `${instalment.instalmentNumber}:${instalment.instalmentStatus}`)
    .join(',');

  useEffect(() => {
    let isActive = true;
    void Promise.all(
      retryableInstalments.map(async (instalment) => {
        const response = await getInstalmentRetryCapability(
          document.id,
          instalment.instalmentNumber,
        );
        return response.ok
          ? [instalment.instalmentNumber, response.data] as const
          : null;
      }),
    ).then((entries) => {
      if (!isActive) return;
      setCapabilities(
        Object.fromEntries(
          entries.filter(
            (entry): entry is readonly [number, InstalmentRetryCapability] =>
              entry !== null,
          ),
        ),
      );
    });
    return () => {
      isActive = false;
    };
  }, [document.id, retryableInstalmentKey]);

  async function handleRetry(instalmentNumber: number) {
    setRetryingNumber(instalmentNumber);
    try {
      const response = await retryInstalmentPayment(
        document.id,
        instalmentNumber,
      );
      if (response.ok) {
        setCapabilities((current) => ({
          ...current,
          [instalmentNumber]: response.data,
        }));
        router.refresh();
      }
    } finally {
      setRetryingNumber(null);
    }
  }

  return (
    <div className={className}>
      <div className="mx-auto w-fit text-center md:hidden">
        <p className="mb-2 text-xs font-semibold text-zinc-600">
          {paidInstalments}/{instalments.length} échéance{instalments.length > 1 ? 's' : ''} réglée{paidInstalments > 1 ? 's' : ''}
        </p>
        <div className="flex h-2 w-40 gap-1 rounded-full" role="img" aria-label={paidInstalments + ' échéance(s) réglée(s) sur ' + instalments.length}>
          {instalments.map((instalment) => (
            <span key={instalment.instalmentNumber} className={`min-w-0 flex-1 rounded-full ${instalment.instalmentStatus === 'SUCCESS' ? 'bg-emerald-500' : 'bg-zinc-200'}`} />
          ))}
        </div>
      </div>
      <div className="hidden h-2 w-full gap-px overflow-visible rounded-full bg-zinc-100 md:flex" role="img" aria-label={paidInstalments + ' échéance(s) réglée(s) sur ' + instalments.length}>
        {instalments.map((instalment) => (
          <span key={instalment.instalmentNumber} className={`min-w-0 flex-1 rounded-full ${instalment.instalmentStatus === 'SUCCESS' ? 'bg-emerald-500' : 'bg-zinc-200'}`} />
        ))}
      </div>
      {retryableInstalments.map((instalment) => {
        const capability = capabilities[instalment.instalmentNumber];
        if (!capability) return null;

        return (
          <div
            key={instalment.instalmentNumber}
            className="mt-3 rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-xs text-zinc-700"
          >
            <p className="font-semibold">
              Échéance {instalment.instalmentNumber} —{' '}
              {formatCurrency(instalment.amountInCents / 100)}
            </p>
            {capability.automaticRetryScheduled ? (
              <p className="mt-1.5 flex gap-2 text-primary">
                <CalendarClock className="h-4 w-4 shrink-0" />
                {capability.message}
                {capability.nextChargeDate
                  ? ` Nouvelle date : ${formatDate(capability.nextChargeDate)}.`
                  : ''}
              </p>
            ) : capability.mandateActionRequired ? (
              <div className="mt-1.5">
                <p className="flex gap-2 text-amber-800">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  {capability.message}
                </p>
                <button
                  type="button"
                  disabled
                  title="La demande de nouvelle autorisation sera disponible prochainement."
                  className="mt-2 rounded-lg border border-amber-300 bg-white px-3 py-2 font-semibold text-amber-800 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  Demander une nouvelle autorisation
                </button>
              </div>
            ) : capability.canRetryManually ? (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span>{capability.message}</span>
                <button
                  type="button"
                  onClick={() => void handleRetry(instalment.instalmentNumber)}
                  disabled={retryingNumber === instalment.instalmentNumber}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  {retryingNumber === instalment.instalmentNumber
                    ? 'Réessai…'
                    : 'Réessayer le prélèvement'}
                </button>
              </div>
            ) : (
              <p className="mt-1.5 text-zinc-600">{capability.message}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
