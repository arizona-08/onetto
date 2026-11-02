ALTER TABLE "InvoicePaymentMode"
ADD COLUMN "firstDueDate" TIMESTAMP(3);

UPDATE "InvoicePaymentMode" AS payment_mode
SET "firstDueDate" = plan."startDate"
FROM "InvoiceInstalmentPlan" AS plan
WHERE payment_mode."invoiceId" = plan."invoiceId";

DELETE FROM "InvoiceInstalmentPlan" AS plan
USING "Document" AS invoice
WHERE plan."invoiceId" = invoice."id"
  AND invoice."invoiceStatus" = 'DRAFT';
