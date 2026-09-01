ALTER TABLE "ReceivedElectronicInvoice"
  ADD COLUMN "originalArchiveKey" TEXT,
  ADD COLUMN "originalSha256" TEXT,
  ADD COLUMN "originalContentType" TEXT,
  ADD COLUMN "originalFileName" TEXT,
  ADD COLUMN "originalArchivedAt" TIMESTAMP(3),
  ADD COLUMN "originalArchiveError" TEXT;

CREATE UNIQUE INDEX "ReceivedElectronicInvoice_originalArchiveKey_key"
  ON "ReceivedElectronicInvoice"("originalArchiveKey");
