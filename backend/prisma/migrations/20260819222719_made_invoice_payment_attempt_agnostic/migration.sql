/*
  Warnings:

  - You are about to drop the column `paymentRequestId` on the `InvoicePaymentAttempt` table. All the data in the column will be lost.
  - You are about to drop the column `paymentTransactionErrorStatusReason` on the `InvoicePaymentAttempt` table. All the data in the column will be lost.
  - You are about to drop the column `paymentTransactionId` on the `InvoicePaymentAttempt` table. All the data in the column will be lost.
  - You are about to drop the column `paymentTransactionStatus` on the `InvoicePaymentAttempt` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[provider,providerPaymentId]` on the table `InvoicePaymentAttempt` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "InvoicePaymentAttempt_paymentTransactionId_key";

-- AlterTable
ALTER TABLE "InvoicePaymentAttempt" DROP COLUMN "paymentRequestId",
DROP COLUMN "paymentTransactionErrorStatusReason",
DROP COLUMN "paymentTransactionId",
DROP COLUMN "paymentTransactionStatus",
ADD COLUMN     "failureReason" TEXT,
ADD COLUMN     "paymentStatus" "InvoicePaymentAttemptStatus",
ADD COLUMN     "provider" "PaymentProvider" NOT NULL DEFAULT 'GOCARDLESS',
ADD COLUMN     "providerPaymentId" TEXT,
ADD COLUMN     "providerRequestId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "InvoicePaymentAttempt_provider_providerPaymentId_key" ON "InvoicePaymentAttempt"("provider", "providerPaymentId");
