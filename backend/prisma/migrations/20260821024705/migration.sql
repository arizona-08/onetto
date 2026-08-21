/*
  Warnings:

  - A unique constraint covering the columns `[invoiceInstalmentPlanId,instalmentNumber]` on the table `InvoicePaymentInstalment` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "InvoicePaymentInstalment_invoiceInstalmentPlanId_instalment_key" ON "InvoicePaymentInstalment"("invoiceInstalmentPlanId", "instalmentNumber");
