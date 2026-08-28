'use client';

import { PublicPayment } from '@/app/types';
import { formatCurrency, formatDate } from '@/shared/utils';
import { CreditCard, FileText } from 'lucide-react';

export default function PaymentSummary({ payment }: { payment: PublicPayment }) {
  const { document } = payment;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#e8e9ff_0,transparent_38%),#f9f9fb] px-4 py-8 text-zinc-900 sm:px-6 lg:py-12">
      <div className="mx-auto max-w-3xl">
        <header className="mb-7 flex items-center justify-between rounded-2xl border border-white/70 bg-white/80 px-6 py-5">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary text-white"><FileText className="h-5 w-5" /></span>
            <div>
              <p className="font-title text-lg font-extrabold">Onetto</p>
              <p className="text-sm text-zinc-500">Récapitulatif de votre facture</p>
            </div>
          </div>
          <span className="rounded-full bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary">Facture</span>
        </header>

        <article className="overflow-hidden rounded-2xl bg-white-[0_24px_70px_-45px_rgba(15,23,42,0.45)]">
          <div className="bg-primary/[0.03] px-6 py-7 sm:px-9">
            <p className="font-title text-5xl font-medium uppercase tracking-tighter text-primary">Facture</p>
            <p className="mt-2 text-sm font-semibold text-zinc-500">n° {document.documentNumber}</p>
            <div className="mt-6 grid gap-2 text-sm text-zinc-600 sm:grid-cols-2">
              <p><span className="font-semibold text-zinc-900">Émise par </span>{document.company.name}</p>
              <p><span className="font-semibold text-zinc-900">Échéance </span>{formatDate(document.paymentDueAt)}</p>
            </div>
          </div>

          <div className="px-6 py-7 sm:px-9">
            <div className="space-y-3">
              {document.services?.map((service) => (
                <div key={service.id} className="flex items-center justify-between gap-4 border-b border-zinc-100 pb-3 text-sm">
                  <div><p className="font-semibold">{service.description}</p><p className="text-zinc-500">{service.quantity} {service.unit} · TVA {service.taxRate ?? 0} %</p></div>
                  <p className="font-semibold">{formatCurrency(service.totalPrice)}</p>
                </div>
              ))}
            </div>
            <div className="ml-auto mt-7 w-full max-w-xs rounded-xl bg-zinc-50 p-4 text-sm">
              <div className="flex justify-between text-zinc-500"><span>Sous-total</span><span>{formatCurrency(document.totalPriceExcludingTax)}</span></div>
              <div className="mt-2 flex justify-between border-t border-zinc-200 pt-3 font-semibold text-primary"><span>Total TTC</span><span>{formatCurrency(document.totalPrice)}</span></div>
            </div>
            <a href={payment.paymentLink} className="mt-8 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-primary/90">
              <CreditCard className="h-4 w-4" />
              Payer la facture
            </a>
          </div>
        </article>
      </div>
    </main>
  );
}
