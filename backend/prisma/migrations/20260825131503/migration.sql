/*
  Warnings:

  - Added the required column `customerId` to the `UserSubscription` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "UserSubscription" ADD COLUMN     "customerId" TEXT NOT NULL;
