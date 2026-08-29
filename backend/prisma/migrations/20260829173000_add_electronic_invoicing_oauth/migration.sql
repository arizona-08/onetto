ALTER TABLE "ElectronicInvoicingConnection"
  ADD COLUMN "accessTokenEncrypted" TEXT,
  ADD COLUMN "refreshTokenEncrypted" TEXT,
  ADD COLUMN "accessTokenExpiresAt" TIMESTAMP(3);

CREATE TABLE "ElectronicInvoicingOAuthState" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "state" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ElectronicInvoicingOAuthState_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ElectronicInvoicingOAuthState_state_key" ON "ElectronicInvoicingOAuthState"("state");
CREATE INDEX "ElectronicInvoicingOAuthState_companyId_expiresAt_idx" ON "ElectronicInvoicingOAuthState"("companyId", "expiresAt");

ALTER TABLE "ElectronicInvoicingOAuthState" ADD CONSTRAINT "ElectronicInvoicingOAuthState_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
