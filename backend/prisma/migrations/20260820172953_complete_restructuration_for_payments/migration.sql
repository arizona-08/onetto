/*
  Warnings:

  - You are about to drop the column `invoicePaymentPlanId` on the `InvoicePaymentInstalment` table. All the data in the column will be lost.
  - You are about to drop the `InvoicePaymentAttempt` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `InvoicePaymentPlan` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `InvoicePaymentSession` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[providerPaymentId]` on the table `InvoicePaymentInstalment` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `invoiceInstalmentPlanId` to the `InvoicePaymentInstalment` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "InvoicePaymentAttempt" DROP CONSTRAINT "InvoicePaymentAttempt_invoicePaymentSessionId_fkey";

-- DropForeignKey
ALTER TABLE "InvoicePaymentInstalment" DROP CONSTRAINT "InvoicePaymentInstalment_invoicePaymentPlanId_fkey";

-- DropForeignKey
ALTER TABLE "InvoicePaymentPlan" DROP CONSTRAINT "InvoicePaymentPlan_invoiceId_fkey";

-- DropForeignKey
ALTER TABLE "InvoicePaymentSession" DROP CONSTRAINT "InvoicePaymentSession_invoiceId_fkey";

-- DropForeignKey
ALTER TABLE "InvoicePaymentSession" DROP CONSTRAINT "InvoicePaymentSession_invoiceInstalmentId_fkey";

-- DropForeignKey
ALTER TABLE "InvoicePaymentSession" DROP CONSTRAINT "InvoicePaymentSession_paymentLinkId_fkey";

-- AlterTable
ALTER TABLE "InvoicePaymentInstalment" DROP COLUMN "invoicePaymentPlanId",
ADD COLUMN     "invoiceInstalmentPlanId" TEXT NOT NULL,
ADD COLUMN     "providerPaymentId" TEXT;

-- DropTable
DROP TABLE "InvoicePaymentAttempt";

-- DropTable
DROP TABLE "InvoicePaymentPlan";

-- DropTable
DROP TABLE "InvoicePaymentSession";

-- CreateTable
CREATE TABLE "PayByBankPayment" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "invoicePaymentLinkId" TEXT,
    "amountInCents" INTEGER NOT NULL,
    "provider" "PaymentProvider" NOT NULL DEFAULT 'BRIDGE',
    "providerReferece" TEXT NOT NULL,
    "status" "InvoicePaymentStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayByBankPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayByBankPaymentAttempt" (
    "id" TEXT NOT NULL,
    "payByBankPaymentId" TEXT NOT NULL,
    "providerReference" TEXT NOT NULL,
    "paymentStatus" "InvoicePaymentAttemptStatus",
    "failureReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayByBankPaymentAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoiceInstalmentPlan" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "totalAmountInCents" INTEGER NOT NULL,
    "numberOfInstalments" INTEGER NOT NULL,
    "amountPerInstalmentInCents" INTEGER NOT NULL,
    "providerScheduledId" TEXT,
    "providerMandateId" TEXT,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "InvoiceInstalmentPlan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PayByBankPayment_providerReferece_key" ON "PayByBankPayment"("providerReferece");

-- CreateIndex
CREATE UNIQUE INDEX "PayByBankPaymentAttempt_providerReference_key" ON "PayByBankPaymentAttempt"("providerReference");

-- CreateIndex
CREATE UNIQUE INDEX "PayByBankPaymentAttempt_providerReference_payByBankPaymentI_key" ON "PayByBankPaymentAttempt"("providerReference", "payByBankPaymentId");

-- CreateIndex
CREATE UNIQUE INDEX "InvoiceInstalmentPlan_invoiceId_key" ON "InvoiceInstalmentPlan"("invoiceId");

-- CreateIndex
CREATE UNIQUE INDEX "InvoicePaymentInstalment_providerPaymentId_key" ON "InvoicePaymentInstalment"("providerPaymentId");

-- AddForeignKey
ALTER TABLE "PayByBankPayment" ADD CONSTRAINT "PayByBankPayment_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayByBankPayment" ADD CONSTRAINT "PayByBankPayment_invoicePaymentLinkId_fkey" FOREIGN KEY ("invoicePaymentLinkId") REFERENCES "InvoicePaymentLink"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayByBankPaymentAttempt" ADD CONSTRAINT "PayByBankPaymentAttempt_payByBankPaymentId_fkey" FOREIGN KEY ("payByBankPaymentId") REFERENCES "PayByBankPayment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceInstalmentPlan" ADD CONSTRAINT "InvoiceInstalmentPlan_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoicePaymentInstalment" ADD CONSTRAINT "InvoicePaymentInstalment_invoiceInstalmentPlanId_fkey" FOREIGN KEY ("invoiceInstalmentPlanId") REFERENCES "InvoiceInstalmentPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
