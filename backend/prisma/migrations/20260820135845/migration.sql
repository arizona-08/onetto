/*
  Warnings:

  - A unique constraint covering the columns `[invoicePaymentLinkId]` on the table `InvoicePublicAccess` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `invoicePaymentLinkId` to the `InvoicePublicAccess` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "InvoicePublicAccess" ADD COLUMN     "invoicePaymentLinkId" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "InvoicePublicAccess_invoicePaymentLinkId_key" ON "InvoicePublicAccess"("invoicePaymentLinkId");

-- AddForeignKey
ALTER TABLE "InvoicePublicAccess" ADD CONSTRAINT "InvoicePublicAccess_invoicePaymentLinkId_fkey" FOREIGN KEY ("invoicePaymentLinkId") REFERENCES "InvoicePaymentLink"("id") ON DELETE CASCADE ON UPDATE CASCADE;
