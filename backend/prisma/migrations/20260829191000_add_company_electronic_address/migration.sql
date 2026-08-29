CREATE TYPE "CompanyElectronicAddressScheme" AS ENUM ('SIREN', 'SIRET', 'VAT', 'GLN', 'PEPPOL');

ALTER TABLE "Company"
  ADD COLUMN "electronicAddress" TEXT,
  ADD COLUMN "electronicAddressScheme" "CompanyElectronicAddressScheme" NOT NULL DEFAULT 'SIREN';

UPDATE "Company" SET "electronicAddress" = "siren" WHERE "electronicAddress" IS NULL;

ALTER TABLE "Company" ALTER COLUMN "electronicAddress" SET NOT NULL;
