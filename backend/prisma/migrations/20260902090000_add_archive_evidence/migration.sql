ALTER TABLE "Document"
  ADD COLUMN "facturXArchiveVersion" TEXT,
  ADD COLUMN "facturXEvidenceKey" TEXT;

ALTER TABLE "ReceivedElectronicInvoice"
  ADD COLUMN "originalArchiveVersion" TEXT,
  ADD COLUMN "originalEvidenceKey" TEXT;
