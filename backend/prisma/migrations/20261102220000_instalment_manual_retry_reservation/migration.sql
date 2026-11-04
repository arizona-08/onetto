ALTER TABLE "InvoicePaymentInstalment"
ADD COLUMN "manualRetryRequestedAt" TIMESTAMP(3),
ADD COLUMN "lastProviderEventAt" TIMESTAMP(3);
