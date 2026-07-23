/*
  Warnings:

  - Added the required column `unit` to the `InvoiceService` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "InvoiceService" ADD COLUMN     "unit" TEXT NOT NULL;
