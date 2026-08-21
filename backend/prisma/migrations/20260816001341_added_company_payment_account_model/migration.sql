-- CreateEnum
CREATE TYPE "PaymentProvider" AS ENUM ('BRIDGE', 'GOCARDLESS');

-- CreateTable
CREATE TABLE "CompanyPaymentAccount" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "provider" "PaymentProvider" NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,

    CONSTRAINT "CompanyPaymentAccount_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "CompanyPaymentAccount" ADD CONSTRAINT "CompanyPaymentAccount_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
