-- AlterTable
ALTER TABLE "User" ADD COLUMN     "lastConnectedCompanyId" TEXT;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_lastConnectedCompanyId_fkey" FOREIGN KEY ("lastConnectedCompanyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;
