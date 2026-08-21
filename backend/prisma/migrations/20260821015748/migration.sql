/*
  Warnings:

  - A unique constraint covering the columns `[providerReference]` on the table `InvoiceInstalmentPlan` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `providerReference` to the `InvoiceInstalmentPlan` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "InvoiceInstalmentPlan" ADD COLUMN     "providerReference" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "InvoiceInstalmentPlan_providerReference_key" ON "InvoiceInstalmentPlan"("providerReference");
