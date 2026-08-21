/*
  Warnings:

  - A unique constraint covering the columns `[companyId]` on the table `CompanyPaymentAccount` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "CompanyPaymentAccount_companyId_key" ON "CompanyPaymentAccount"("companyId");
