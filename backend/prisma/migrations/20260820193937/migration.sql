/*
  Warnings:

  - A unique constraint covering the columns `[providerReference,providerPaymentId]` on the table `PayByBankPaymentAttempt` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "PayByBankPaymentAttempt_providerReference_payByBankPaymentI_key";

-- CreateIndex
CREATE UNIQUE INDEX "PayByBankPaymentAttempt_providerReference_providerPaymentId_key" ON "PayByBankPaymentAttempt"("providerReference", "providerPaymentId");
