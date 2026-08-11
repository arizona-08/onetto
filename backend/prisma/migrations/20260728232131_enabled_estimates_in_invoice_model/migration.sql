/*
  Warnings:

  - You are about to drop the column `status` on the `Invoice` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "EstimateStatus" AS ENUM ('DRAFT', 'SENT', 'ACCEPTED', 'REJECTED');

-- AlterTable
ALTER TABLE "Invoice" DROP COLUMN "status",
ADD COLUMN     "estimateStatus" "EstimateStatus" NOT NULL DEFAULT 'DRAFT',
ADD COLUMN     "invoiceStatus" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT';
