/*
  Warnings:

  - You are about to drop the column `isVerified` on the `CompanyPaymentAccount` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "CompanyPaymentAccountVerificationStatus" AS ENUM ('NOT_VERIFIED', 'IN_REVIEW', 'VERIFIED');

-- AlterTable
ALTER TABLE "CompanyPaymentAccount" DROP COLUMN "isVerified",
ADD COLUMN     "verificationStatus" "CompanyPaymentAccountVerificationStatus" NOT NULL DEFAULT 'NOT_VERIFIED';
