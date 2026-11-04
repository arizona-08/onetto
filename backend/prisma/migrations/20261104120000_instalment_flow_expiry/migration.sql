ALTER TABLE "InvoicePaymentLink"
ADD COLUMN "providerFlowId" TEXT,
ADD COLUMN "providerFlowExpiresAt" TIMESTAMP(3);

ALTER TABLE "InvoiceInstalmentPlan"
ADD COLUMN "authorizationFailureReason" TEXT;

-- Preserve the promised 30-day Onetto window for instalment links already sent.
UPDATE "InvoicePublicAccess" access
SET "expiresAt" = GREATEST(access."expiresAt", invoice."sentAt" + INTERVAL '30 days')
FROM "Document" invoice
JOIN "InvoiceInstalmentPlan" plan ON plan."invoiceId" = invoice.id
WHERE access."invoiceId" = invoice.id
  AND invoice."sentAt" IS NOT NULL;
