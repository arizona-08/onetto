import type { Document } from "@/app/types";

export function getInvoicePaymentSummary(document: Document) {
  const instalments =
    document.invoicePaymentMode?.paymentMode === "INSTALMENTS"
      ? document.invoiceInstalmentPlan?.invoicePaymentInstalments
      : undefined;
  const total = document.totalPrice;

  if (instalments?.length) {
    const collected = instalments
      .filter((instalment) => instalment.instalmentStatus === "SUCCESS")
      .reduce((sum, instalment) => sum + instalment.amountInCents, 0) / 100;
    const nextInstalment = instalments
      .filter((instalment) => instalment.instalmentStatus !== "SUCCESS")
      .sort((first, second) => first.dueDate.localeCompare(second.dueDate))[0];
    return {
      collected,
      total,
      percent: total > 0 ? Math.min(100, Math.round((collected / total) * 100)) : 0,
      nextInstalment,
      instalments,
    };
  }

  const settled = ["PAID", "PAID_MANUALLY"].includes(document.invoiceStatus);
  const amountKnown = !["PARTIALLY_PAID"].includes(document.invoiceStatus);
  return {
    collected: amountKnown ? (settled ? total : 0) : null,
    total,
    percent: amountKnown ? (settled ? 100 : 0) : null,
    nextInstalment: undefined,
    instalments: undefined,
  };
}
