/*
  Warnings:

  - You are about to drop the column `vat` on the `InvoiceService` table. All the data in the column will be lost.
  - You are about to drop the column `vat` on the `UserService` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "InvoiceService" DROP COLUMN "vat",
ADD COLUMN     "taxRate" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "UserService" DROP COLUMN "vat",
ADD COLUMN     "taxRate" DOUBLE PRECISION;
