-- A user can own more than one company.
DROP INDEX "Company_ownerId_key";

-- A user can only have one membership record per company.
CREATE UNIQUE INDEX "CompanyUser_companyId_userId_key" ON "CompanyUser"("companyId", "userId");
