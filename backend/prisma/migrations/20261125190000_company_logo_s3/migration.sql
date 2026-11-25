ALTER TABLE "CompanyLogo"
  ALTER COLUMN "content" DROP NOT NULL,
  ADD COLUMN "s3Key" TEXT,
  ADD COLUMN "contentType" TEXT;
