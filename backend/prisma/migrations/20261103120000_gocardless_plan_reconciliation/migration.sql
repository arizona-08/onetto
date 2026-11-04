ALTER TABLE "InvoiceInstalmentPlan"
ADD COLUMN "lastReconciledAt" TIMESTAMP(3),
ADD COLUMN "nextReconciliationAt" TIMESTAMP(3),
ADD COLUMN "reconciliationLeaseUntil" TIMESTAMP(3),
ADD COLUMN "reconciliationFailureCount" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "ProcessedWebhookEvents"
ADD COLUMN "claimedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN "completedAt" TIMESTAMP(3);

UPDATE "ProcessedWebhookEvents"
SET "completedAt" = "processedAt", "claimedAt" = "processedAt";
