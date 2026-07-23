/*
  Warnings:

  - Added the required column `totalPriceExcludingTax` to the `Invoice` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "CompanyUserRole" AS ENUM ('ADMIN', 'ACCOUNTANT', 'EMPLOYEE');

-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "totalPriceExcludingTax" DOUBLE PRECISION NOT NULL;

-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "siren" TEXT NOT NULL,
    "siret" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "postalCode" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "subjectToVat" BOOLEAN NOT NULL,
    "vatNumber" TEXT,
    "IBAN" TEXT NOT NULL,
    "BIC" TEXT NOT NULL,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanyUser" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "CompanyUserRole" NOT NULL,

    CONSTRAINT "CompanyUser_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Company_ownerId_key" ON "Company"("ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "Company_email_key" ON "Company"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Company_phoneNumber_key" ON "Company"("phoneNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Company_siren_key" ON "Company"("siren");

-- CreateIndex
CREATE UNIQUE INDEX "Company_siret_key" ON "Company"("siret");

-- AddForeignKey
ALTER TABLE "Company" ADD CONSTRAINT "Company_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyUser" ADD CONSTRAINT "CompanyUser_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyUser" ADD CONSTRAINT "CompanyUser_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
