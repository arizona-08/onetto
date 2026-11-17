"use client";

import { PublicPayment } from "@/app/types";
import { formatCurrency, formatDate } from "@/shared/utils";
import { CreditCard, FileText } from "lucide-react";
import InstalmentSchedule from "../components/molecules/InstalmentSchedule";

export default function PaymentSummary({
  payment,
  token,
}: {
  payment: PublicPayment;
  token: string;
}) {
  const { document } = payment;
  const instalments =
    document.invoiceInstalmentPlan?.invoicePaymentInstalments ?? [];

  return (
    <main className="min-h-dvh bg-ui-background px-4 py-8 text-ui-text sm:px-6 lg:py-12">
      <div className="mx-auto max-w-3xl">
        <header className="mb-7 flex items-center justify-between gap-4 rounded-ui-card border border-ui-border bg-ui-surface px-5 py-4 shadow-ui-card sm:px-6 sm:py-5">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-ui-control bg-ui-primary-soft text-ui-primary">
              <FileText className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <p className="font-title text-lg font-semibold text-ui-text">Onetto</p>
              <p className="text-sm text-ui-secondary">
                Récapitulatif de votre facture
              </p>
            </div>
          </div>
          <span className="rounded-full bg-ui-primary-soft px-3 py-1.5 text-xs font-semibold text-ui-primary">
            Facture
          </span>
        </header>

        <article className="overflow-hidden rounded-ui-card border border-ui-border bg-ui-surface shadow-ui-card">
          <div className="border-b border-ui-border bg-ui-primary-soft/35 px-5 py-6 sm:px-8 sm:py-7">
            <h1 className="font-title text-3xl font-semibold tracking-tight text-ui-text sm:text-4xl">
              Facture
            </h1>
            <p className="mt-1 text-sm font-medium text-ui-secondary">
              n° {document.documentNumber}
            </p>
            <div className="mt-6 grid gap-4 text-sm text-ui-secondary sm:grid-cols-2">
              <p>
                <span className="block text-xs font-medium text-ui-secondary">Émise par</span>
                <span className="mt-1 block font-semibold text-ui-text">{document.company.name}</span>
              </p>
              <p>
                <span className="block text-xs font-medium text-ui-secondary">Échéance</span>
                <span className="mt-1 block font-semibold text-ui-text">{formatDate(document.paymentDueAt)}</span>
              </p>
            </div>
          </div>

          <div className="px-5 py-6 sm:px-8 sm:py-7">
            <div className="divide-y divide-ui-border">
              {document.services?.map((service) => (
                <div
                  key={service.id}
                  className="flex items-start justify-between gap-4 py-3.5 text-sm first:pt-0"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-ui-text">{service.description}</p>
                    <p className="mt-1 text-xs text-ui-secondary">
                      {service.quantity} {service.unit} · TVA{" "}
                      {service.taxRate ?? 0} %
                    </p>
                  </div>
                  <p className="shrink-0 font-semibold tabular-nums text-ui-text">
                    {formatCurrency(service.totalPrice)}
                  </p>
                </div>
              ))}
            </div>
            <div className="ml-auto mt-6 w-full max-w-xs rounded-ui-control border border-ui-border bg-ui-subtle p-4 text-sm">
              <div className="flex justify-between gap-4 text-ui-secondary">
                <span>Sous-total</span>
                <span className="tabular-nums">{formatCurrency(document.totalPriceExcludingTax)}</span>
              </div>
              <div className="mt-3 flex justify-between gap-4 border-t border-ui-border pt-3 font-semibold text-ui-primary">
                <span>Total TTC</span>
                <span className="tabular-nums">{formatCurrency(document.totalPrice)}</span>
              </div>
            </div>
            <InstalmentSchedule instalments={instalments} className="mt-6" />
            {payment.paymentLink ? (
              <a
                href={document.invoicePaymentMode?.paymentMode === 'INSTALMENTS'
                  ? `/payment/authorize?token=${encodeURIComponent(token)}`
                  : payment.paymentLink}
                className="mt-7 flex min-h-11 w-full items-center justify-center gap-2 rounded-ui-control bg-ui-primary px-5 py-3 text-sm font-semibold text-white shadow-ui-card transition-colors hover:bg-ui-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ui-primary"
              >
                <CreditCard className="h-4 w-4" aria-hidden="true" />
                Payer la facture
              </a>
            ) : (
              <p className="mt-7 rounded-ui-control border border-ui-border bg-ui-subtle px-4 py-3 text-sm leading-6 text-ui-secondary">
                {payment.paymentMessage ?? "Le paiement en ligne de cette facture n’est plus disponible."}
              </p>
            )}
          </div>
        </article>
      </div>
    </main>
  );
}
