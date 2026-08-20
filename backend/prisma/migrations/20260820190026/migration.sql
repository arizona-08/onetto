/*
  Warnings:

  - A unique constraint covering the columns `[providerReference]` on the table `InvoicePaymentLink` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `providerReference` to the `InvoicePaymentLink` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "InvoicePaymentLink" ADD COLUMN     "providerReference" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "InvoicePaymentLink_providerReference_key" ON "InvoicePaymentLink"("providerReference");
