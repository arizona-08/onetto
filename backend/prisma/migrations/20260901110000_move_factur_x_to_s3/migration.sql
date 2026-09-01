ALTER TABLE "Document"
  ADD COLUMN "facturXArchiveKey" TEXT,
  ADD COLUMN "facturXContentSha256" TEXT,
  ADD COLUMN "facturXArchivedAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "Document_facturXArchiveKey_key" ON "Document"("facturXArchiveKey");
