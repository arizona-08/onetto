-- AlterTable
ALTER TABLE "CompanyPaymentAccount" ADD COLUMN     "creditorId" TEXT,
ADD COLUMN     "isVerified" BOOLEAN NOT NULL DEFAULT false;
