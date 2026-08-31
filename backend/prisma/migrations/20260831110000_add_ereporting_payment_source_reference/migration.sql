ALTER TABLE "ElectronicReportingSubmission"
  ADD COLUMN "sourcePaymentReference" TEXT;

CREATE UNIQUE INDEX "ElectronicReportingSubmission_provider_sourcePaymentReference_key"
  ON "ElectronicReportingSubmission"("provider", "sourcePaymentReference");
