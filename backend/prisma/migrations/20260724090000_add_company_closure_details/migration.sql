-- Preserve the legal/accounting context of a company closure.
ALTER TABLE "Company" ADD COLUMN "closingReason" TEXT;
ALTER TABLE "Company" ADD COLUMN "closedAt" TIMESTAMP(3);
