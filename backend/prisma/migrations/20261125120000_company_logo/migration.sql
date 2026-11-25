ALTER TABLE "Company" ADD COLUMN "logoUpdatedAt" TIMESTAMP(3);

CREATE TABLE "CompanyLogo" (
    "companyId" TEXT NOT NULL,
    "content" BYTEA NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanyLogo_pkey" PRIMARY KEY ("companyId")
);

ALTER TABLE "CompanyLogo" ADD CONSTRAINT "CompanyLogo_companyId_fkey"
    FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
