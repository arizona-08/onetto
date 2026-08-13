-- Existing sent invoices are awaiting payment under the new workflow.
UPDATE "Document"
SET "invoiceStatus" = 'PENDING'
WHERE "invoiceStatus" = 'SENT';

-- PostgreSQL does not support removing enum values directly.
CREATE TYPE "InvoiceStatus_new" AS ENUM (
  'DRAFT',
  'PENDING',
  'PAYMENT_IN_PROGRESS',
  'PAID',
  'PAID_MANUALLY',
  'OVERDUE',
  'REJECTED'
);

ALTER TABLE "Document"
ALTER COLUMN "invoiceStatus" DROP DEFAULT;

ALTER TABLE "Document"
ALTER COLUMN "invoiceStatus" TYPE "InvoiceStatus_new"
USING "invoiceStatus"::text::"InvoiceStatus_new";

DROP TYPE "InvoiceStatus";
ALTER TYPE "InvoiceStatus_new" RENAME TO "InvoiceStatus";

ALTER TABLE "Document"
ALTER COLUMN "invoiceStatus" SET DEFAULT 'DRAFT';
