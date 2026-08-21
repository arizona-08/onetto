/*
  Warnings:

  - Added the required column `providerPaymentId` to the `PayByBankPaymentAttempt` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "PayByBankPaymentAttempt" ADD COLUMN     "providerPaymentId" TEXT NOT NULL;
