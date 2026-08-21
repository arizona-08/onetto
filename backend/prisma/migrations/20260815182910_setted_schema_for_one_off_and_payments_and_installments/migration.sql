/*
  Warnings:

  - You are about to drop the `BridgePaymentAttempt` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `BridgePaymentLinkSession` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "InvoicePaymentLinkStatus" AS ENUM ('VALID', 'COMPLETED', 'EXPIRED', 'REVOKED');

-- CreateEnum
CREATE TYPE "InvoicePaymentStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED');

-- CreateEnum
CREATE TYPE "InvoicePaymentAttemptStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED');

-- CreateEnum
CREATE TYPE "InvoicePaymentInstallmentStatus" AS ENUM ('PENDING', 'PAID', 'OVERDUE');

-- AlterEnum
ALTER TYPE "InvoiceStatus" ADD VALUE 'PARTIALLY_PAID';

-- DropForeignKey
ALTER TABLE "BridgePaymentAttempt" DROP CONSTRAINT "BridgePaymentAttempt_bridgePaymentLinkSessionId_fkey";

-- DropForeignKey
ALTER TABLE "BridgePaymentLinkSession" DROP CONSTRAINT "BridgePaymentLinkSession_documentId_fkey";

-- AlterTable
ALTER TABLE "CompanyService" ALTER COLUMN "name" DROP DEFAULT,
ALTER COLUMN "unit" DROP DEFAULT,
ALTER COLUMN "category" DROP DEFAULT;

-- DropTable
DROP TABLE "BridgePaymentAttempt";

-- DropTable
DROP TABLE "BridgePaymentLinkSession";

-- DropEnum
DROP TYPE "BridgePaymentLinkStatus";

-- DropEnum
DROP TYPE "BridgePaymentTransactionStatus";

-- CreateTable
CREATE TABLE "InvoicePaymentLinkSession" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "paymentLinkId" TEXT NOT NULL,
    "paymentAccessToken" TEXT NOT NULL,
    "linkStatus" "InvoicePaymentLinkStatus",
    "paymentStatus" "InvoicePaymentStatus" NOT NULL,
    "url" TEXT NOT NULL,
    "invoicePaymentInstallmentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvoicePaymentLinkSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoicePaymentAttempt" (
    "id" TEXT NOT NULL,
    "invoicePaymentLinkSessionId" TEXT NOT NULL,
    "paymentRequestId" TEXT,
    "paymentTransactionId" TEXT NOT NULL,
    "paymentTransactionStatus" "InvoicePaymentAttemptStatus",
    "paymentTransactionErrorStatusReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvoicePaymentAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoicePaymentPlan" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "totalAmountInCents" INTEGER NOT NULL,
    "numberOfInstallments" INTEGER NOT NULL,
    "amountPerInstallmentInCents" INTEGER NOT NULL,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "InvoicePaymentPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoicePaymentInstallment" (
    "id" TEXT NOT NULL,
    "invoicePaymentPlanId" TEXT NOT NULL,
    "installmentNumber" INTEGER NOT NULL,
    "amountInCents" INTEGER NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "installmentStatus" "InvoicePaymentInstallmentStatus" NOT NULL DEFAULT 'PENDING',
    "paidAt" TIMESTAMP(3),

    CONSTRAINT "InvoicePaymentInstallment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InvoicePaymentLinkSession_paymentLinkId_key" ON "InvoicePaymentLinkSession"("paymentLinkId");

-- CreateIndex
CREATE UNIQUE INDEX "InvoicePaymentLinkSession_paymentAccessToken_key" ON "InvoicePaymentLinkSession"("paymentAccessToken");

-- CreateIndex
CREATE UNIQUE INDEX "InvoicePaymentAttempt_paymentTransactionId_key" ON "InvoicePaymentAttempt"("paymentTransactionId");

-- CreateIndex
CREATE UNIQUE INDEX "InvoicePaymentPlan_invoiceId_key" ON "InvoicePaymentPlan"("invoiceId");

-- AddForeignKey
ALTER TABLE "InvoicePaymentLinkSession" ADD CONSTRAINT "InvoicePaymentLinkSession_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoicePaymentLinkSession" ADD CONSTRAINT "InvoicePaymentLinkSession_invoicePaymentInstallmentId_fkey" FOREIGN KEY ("invoicePaymentInstallmentId") REFERENCES "InvoicePaymentInstallment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoicePaymentAttempt" ADD CONSTRAINT "InvoicePaymentAttempt_invoicePaymentLinkSessionId_fkey" FOREIGN KEY ("invoicePaymentLinkSessionId") REFERENCES "InvoicePaymentLinkSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoicePaymentPlan" ADD CONSTRAINT "InvoicePaymentPlan_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoicePaymentInstallment" ADD CONSTRAINT "InvoicePaymentInstallment_invoicePaymentPlanId_fkey" FOREIGN KEY ("invoicePaymentPlanId") REFERENCES "InvoicePaymentPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
