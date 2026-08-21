/*
  Warnings:

  - You are about to drop the column `documentId` on the `InvoicePaymentLinkSession` table. All the data in the column will be lost.
  - Added the required column `invoiceId` to the `InvoicePaymentLinkSession` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "InvoicePaymentLinkSession" DROP CONSTRAINT "InvoicePaymentLinkSession_documentId_fkey";

-- AlterTable
ALTER TABLE "InvoicePaymentLinkSession" DROP COLUMN "documentId",
ADD COLUMN     "invoiceId" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "InvoicePaymentLinkSession" ADD CONSTRAINT "InvoicePaymentLinkSession_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;
