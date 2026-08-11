DROP INDEX IF EXISTS "Document_companyId_documentNumber_key";

CREATE UNIQUE INDEX IF NOT EXISTS "Document_companyId_documentNumber_versionNumber_key"
ON "Document"("companyId", "documentNumber", "versionNumber");
