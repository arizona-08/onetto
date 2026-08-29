CREATE TYPE "CompanyClientType" AS ENUM ('BUSINESS', 'CLIENT');

ALTER TABLE "CompanyClient"
  ADD COLUMN "clientType" "CompanyClientType" NOT NULL DEFAULT 'CLIENT';
