ALTER TABLE "Document"
ADD COLUMN "isFromEstimate" BOOLEAN DEFAULT true;

UPDATE "Document"
SET "isFromEstimate" = false
WHERE "type" = 'INVOICE' AND "sourceDocumentId" IS NULL;
