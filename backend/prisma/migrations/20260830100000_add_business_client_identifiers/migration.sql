ALTER TABLE "CompanyClient" ADD COLUMN "siren" TEXT, ADD COLUMN "vatNumber" TEXT, ADD COLUMN "electronicAddress" TEXT, ADD COLUMN "electronicAddressScheme" TEXT;
ALTER TABLE "Document" ADD COLUMN "clientElectronicAddress" TEXT, ADD COLUMN "clientElectronicAddressScheme" TEXT;
