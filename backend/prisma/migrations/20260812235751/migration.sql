/*
  Warnings:

  - A unique constraint covering the columns `[paymentTransactionId]` on the table `BridgePaymentAttempt` will be added. If there are existing duplicate values, this will fail.
  - Made the column `paymentRequestId` on table `BridgePaymentAttempt` required. This step will fail if there are existing NULL values in that column.
  - Made the column `paymentTransactionId` on table `BridgePaymentAttempt` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "BridgePaymentAttempt" ALTER COLUMN "paymentRequestId" SET NOT NULL,
ALTER COLUMN "paymentTransactionId" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "BridgePaymentAttempt_paymentTransactionId_key" ON "BridgePaymentAttempt"("paymentTransactionId");
