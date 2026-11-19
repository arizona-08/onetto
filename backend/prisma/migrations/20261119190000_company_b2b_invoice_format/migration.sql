CREATE TYPE "B2BInvoiceFormat" AS ENUM ('UBL', 'FACTUR_X');

ALTER TABLE "Company"
  ADD COLUMN "b2bInvoiceFormat" "B2BInvoiceFormat" NOT NULL DEFAULT 'UBL';
