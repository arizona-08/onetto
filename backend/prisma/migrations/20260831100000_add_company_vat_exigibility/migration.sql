CREATE TYPE "CompanyVatExigibility" AS ENUM ('UNKNOWN', 'ON_COLLECTION', 'ON_DEBITS');

ALTER TABLE "Company"
  ADD COLUMN "vatExigibility" "CompanyVatExigibility" NOT NULL DEFAULT 'UNKNOWN';

-- Preserve the only unambiguous existing choice. A previous `false` cannot
-- distinguish TVA on collection from an unanswered question.
UPDATE "Company"
SET "vatExigibility" = 'ON_DEBITS'
WHERE "hasVatOnDebits" = true;
