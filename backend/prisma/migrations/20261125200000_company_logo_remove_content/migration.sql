DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "CompanyLogo" WHERE "content" IS NOT NULL) THEN
    RAISE EXCEPTION 'Company logos must be migrated to S3 before dropping content. Run npm run storage:migrate-company-logos after the preceding migration.';
  END IF;
END $$;

ALTER TABLE "CompanyLogo" DROP COLUMN "content";
