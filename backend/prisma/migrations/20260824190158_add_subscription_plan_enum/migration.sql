/*
  Warnings:

  - You are about to drop the column `role` on the `User` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('BUSINESS_OWNER', 'EMPLOYEE');

-- CreateEnum
CREATE TYPE "SubscriptionPlan" AS ENUM ('FREE', 'PREMIUM', 'PRO');

-- AlterTable
ALTER TABLE "User" DROP COLUMN "role",
ADD COLUMN     "accountType" "AccountType" NOT NULL DEFAULT 'BUSINESS_OWNER',
ADD COLUMN     "ownerSubscriptionPlan" "SubscriptionPlan" NOT NULL DEFAULT 'FREE';

-- DropEnum
DROP TYPE "Role";
