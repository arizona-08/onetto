-- CreateTable
CREATE TABLE "CompanyPaymentOAuthState" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanyPaymentOAuthState_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CompanyPaymentOAuthState_state_key" ON "CompanyPaymentOAuthState"("state");

-- AddForeignKey
ALTER TABLE "CompanyPaymentOAuthState" ADD CONSTRAINT "CompanyPaymentOAuthState_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
