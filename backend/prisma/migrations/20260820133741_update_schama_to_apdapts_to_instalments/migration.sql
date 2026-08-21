/*
  Warnings:

  - You are about to drop the column `invoicePaymentLinkSessionId` on the `InvoicePaymentAttempt` table. All the data in the column will be lost.
  - You are about to drop the column `amountPerInstallmentInCents` on the `InvoicePaymentMode` table. All the data in the column will be lost.
  - You are about to drop the column `numberOfInstallments` on the `InvoicePaymentMode` table. All the data in the column will be lost.
  - You are about to drop the column `amountPerInstallmentInCents` on the `InvoicePaymentPlan` table. All the data in the column will be lost.
  - You are about to drop the column `numberOfInstallments` on the `InvoicePaymentPlan` table. All the data in the column will be lost.
  - You are about to drop the `InvoicePaymentInstallment` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `InvoicePaymentLinkSession` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `invoicePaymentSessionId` to the `InvoicePaymentAttempt` table without a default value. This is not possible if the table is not empty.
  - Added the required column `amountPerInstalmentInCents` to the `InvoicePaymentPlan` table without a default value. This is not possible if the table is not empty.
  - Added the required column `numberOfInstalments` to the `InvoicePaymentPlan` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "InvoicePaymentInstalmentStatus" AS ENUM ('PENDING', 'PAYMENT_IN_PROGRESS', 'SUCCESS', 'FAILED', 'OVERDUE');

-- DropForeignKey
ALTER TABLE "InvoicePaymentAttempt" DROP CONSTRAINT "InvoicePaymentAttempt_invoicePaymentLinkSessionId_fkey";

-- DropForeignKey
ALTER TABLE "InvoicePaymentInstallment" DROP CONSTRAINT "InvoicePaymentInstallment_invoicePaymentPlanId_fkey";

-- DropForeignKey
ALTER TABLE "InvoicePaymentLinkSession" DROP CONSTRAINT "InvoicePaymentLinkSession_invoiceId_fkey";

-- DropForeignKey
ALTER TABLE "InvoicePaymentLinkSession" DROP CONSTRAINT "InvoicePaymentLinkSession_invoicePaymentInstallmentId_fkey";

-- AlterTable
ALTER TABLE "InvoicePaymentAttempt" DROP COLUMN "invoicePaymentLinkSessionId",
ADD COLUMN     "invoicePaymentSessionId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "InvoicePaymentMode" DROP COLUMN "amountPerInstallmentInCents",
DROP COLUMN "numberOfInstallments",
ADD COLUMN     "amountPerInstalmentInCents" INTEGER,
ADD COLUMN     "numberOfInstalments" INTEGER;

-- AlterTable
ALTER TABLE "InvoicePaymentPlan" DROP COLUMN "amountPerInstallmentInCents",
DROP COLUMN "numberOfInstallments",
ADD COLUMN     "amountPerInstalmentInCents" INTEGER NOT NULL,
ADD COLUMN     "numberOfInstalments" INTEGER NOT NULL;

-- DropTable
DROP TABLE "InvoicePaymentInstallment";

-- DropTable
DROP TABLE "InvoicePaymentLinkSession";

-- DropEnum
DROP TYPE "InvoicePaymentInstallmentStatus";

-- CreateTable
CREATE TABLE "InvoicePublicAccess" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvoicePublicAccess_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoicePaymentLink" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "providerLinkId" TEXT NOT NULL,
    "provider" "PaymentProvider" NOT NULL DEFAULT 'BRIDGE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "linkStatus" "InvoicePaymentLinkStatus",

    CONSTRAINT "InvoicePaymentLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoicePaymentSession" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "paymentLinkId" TEXT NOT NULL,
    "invoiceInstalmentId" TEXT,
    "paymentStatus" "InvoicePaymentStatus" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "provider" "PaymentProvider" NOT NULL DEFAULT 'BRIDGE',

    CONSTRAINT "InvoicePaymentSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoicePaymentInstalment" (
    "id" TEXT NOT NULL,
    "invoicePaymentPlanId" TEXT NOT NULL,
    "instalmentNumber" INTEGER NOT NULL,
    "amountInCents" INTEGER NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "instalmentStatus" "InvoicePaymentInstalmentStatus" NOT NULL DEFAULT 'PENDING',
    "paidAt" TIMESTAMP(3),

    CONSTRAINT "InvoicePaymentInstalment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InvoicePublicAccess_invoiceId_key" ON "InvoicePublicAccess"("invoiceId");

-- CreateIndex
CREATE UNIQUE INDEX "InvoicePublicAccess_accessToken_key" ON "InvoicePublicAccess"("accessToken");

-- CreateIndex
CREATE UNIQUE INDEX "InvoicePaymentLink_providerLinkId_key" ON "InvoicePaymentLink"("providerLinkId");

-- AddForeignKey
ALTER TABLE "InvoicePublicAccess" ADD CONSTRAINT "InvoicePublicAccess_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoicePaymentLink" ADD CONSTRAINT "InvoicePaymentLink_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoicePaymentSession" ADD CONSTRAINT "InvoicePaymentSession_paymentLinkId_fkey" FOREIGN KEY ("paymentLinkId") REFERENCES "InvoicePaymentLink"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoicePaymentSession" ADD CONSTRAINT "InvoicePaymentSession_invoiceInstalmentId_fkey" FOREIGN KEY ("invoiceInstalmentId") REFERENCES "InvoicePaymentInstalment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoicePaymentSession" ADD CONSTRAINT "InvoicePaymentSession_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoicePaymentAttempt" ADD CONSTRAINT "InvoicePaymentAttempt_invoicePaymentSessionId_fkey" FOREIGN KEY ("invoicePaymentSessionId") REFERENCES "InvoicePaymentSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoicePaymentInstalment" ADD CONSTRAINT "InvoicePaymentInstalment_invoicePaymentPlanId_fkey" FOREIGN KEY ("invoicePaymentPlanId") REFERENCES "InvoicePaymentPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
