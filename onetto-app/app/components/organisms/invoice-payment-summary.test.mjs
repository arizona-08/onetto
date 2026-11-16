import assert from "node:assert/strict";
import test from "node:test";
import { getInvoicePaymentSummary } from "./invoice-payment-summary.ts";

test("uses confirmed instalments only and finds the earliest unpaid due date", () => {
  const summary = getInvoicePaymentSummary({
    totalPrice: 300,
    invoiceStatus: "PAYMENT_IN_PROGRESS",
    invoicePaymentMode: { paymentMode: "INSTALMENTS" },
    invoiceInstalmentPlan: {
      invoicePaymentInstalments: [
        { instalmentNumber: 1, amountInCents: 10000, dueDate: "2026-01-10", instalmentStatus: "SUCCESS" },
        { instalmentNumber: 3, amountInCents: 10000, dueDate: "2026-03-10", instalmentStatus: "PENDING" },
        { instalmentNumber: 2, amountInCents: 10000, dueDate: "2026-02-10", instalmentStatus: "PAYMENT_IN_PROGRESS" },
      ],
    },
  });

  assert.equal(summary.collected, 100);
  assert.equal(summary.percent, 33);
  assert.equal(summary.nextInstalment?.instalmentNumber, 2);
});

test("does not invent a collected amount for a partially paid one-time invoice", () => {
  const summary = getInvoicePaymentSummary({
    totalPrice: 200,
    invoiceStatus: "PARTIALLY_PAID",
    invoicePaymentMode: { paymentMode: "ONE_TIME" },
  });

  assert.equal(summary.collected, null);
  assert.equal(summary.percent, null);
});

test("fully paid invoices have a complete gauge and no remaining instalment", () => {
  const summary = getInvoicePaymentSummary({
    totalPrice: 200,
    invoiceStatus: "PAID",
    invoicePaymentMode: { paymentMode: "INSTALMENTS" },
    invoiceInstalmentPlan: {
      invoicePaymentInstalments: [
        { instalmentNumber: 1, amountInCents: 10000, dueDate: "2026-01-10", instalmentStatus: "SUCCESS" },
        { instalmentNumber: 2, amountInCents: 10000, dueDate: "2026-02-10", instalmentStatus: "SUCCESS" },
      ],
    },
  });

  assert.equal(summary.collected, 200);
  assert.equal(summary.percent, 100);
  assert.equal(summary.nextInstalment, undefined);
});
