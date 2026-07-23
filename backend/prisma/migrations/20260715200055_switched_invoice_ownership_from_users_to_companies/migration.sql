/*
  Warnings:

  - You are about to drop the column `authorId` on the `Invoice` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[companyId,invoiceNumber]` on the table `Invoice` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `companyId` to the `Invoice` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Invoice" DROP CONSTRAINT "Invoice_authorId_fkey";

-- DropIndex
DROP INDEX "Invoice_invoiceNumber_key";

-- AlterTable
ALTER TABLE "Invoice" DROP COLUMN "authorId",
ADD COLUMN     "companyId" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_companyId_invoiceNumber_key" ON "Invoice"("companyId", "invoiceNumber");

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
