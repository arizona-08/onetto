/*
  Warnings:

  - You are about to drop the column `providerLinkId` on the `InvoicePaymentLink` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[providerLinkId]` on the table `InvoicePaymentSession` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `providerLinkId` to the `InvoicePaymentSession` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "InvoicePaymentLink_providerLinkId_key";

-- AlterTable
ALTER TABLE "InvoicePaymentLink" DROP COLUMN "providerLinkId";

-- AlterTable
ALTER TABLE "InvoicePaymentSession" ADD COLUMN     "providerLinkId" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "InvoicePaymentSession_providerLinkId_key" ON "InvoicePaymentSession"("providerLinkId");
