/*
  Warnings:

  - Added the required column `subscriptionId` to the `UserSubscription` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "UserSubscription" ADD COLUMN     "subscriptionId" TEXT NOT NULL;
