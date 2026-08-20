/*
  Warnings:

  - You are about to drop the column `providerReferece` on the `PayByBankPayment` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[providerReference]` on the table `PayByBankPayment` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `providerReference` to the `PayByBankPayment` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "PayByBankPayment_providerReferece_key";

-- AlterTable
ALTER TABLE "PayByBankPayment" DROP COLUMN "providerReferece",
ADD COLUMN     "providerReference" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "PayByBankPayment_providerReference_key" ON "PayByBankPayment"("providerReference");
