/*
  Warnings:

  - You are about to drop the column `ownerSubscriptionPlan` on the `User` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "User" DROP COLUMN "ownerSubscriptionPlan",
ADD COLUMN     "subscriptionPlan" "SubscriptionPlan";
