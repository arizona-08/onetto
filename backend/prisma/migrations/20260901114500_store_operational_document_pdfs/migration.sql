ALTER TABLE "Document"
  ADD COLUMN "documentPdfSha256" TEXT,
  ADD COLUMN "documentPdfStoredAt" TIMESTAMP(3);
