/*
  Warnings:

  - You are about to drop the `UserClient` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `UserService` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "UserClient" DROP CONSTRAINT "UserClient_authorId_fkey";

-- DropForeignKey
ALTER TABLE "UserService" DROP CONSTRAINT "UserService_userId_fkey";

-- DropTable
DROP TABLE "UserClient";

-- DropTable
DROP TABLE "UserService";

-- CreateTable
CREATE TABLE "CompanyService" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "unitPrice" DOUBLE PRECISION NOT NULL,
    "taxRate" DOUBLE PRECISION,
    "wtPrice" DOUBLE PRECISION NOT NULL,
    "totalPrice" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "CompanyService_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanyClient" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "postalCode" TEXT NOT NULL,
    "country" TEXT NOT NULL,

    CONSTRAINT "CompanyClient_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "CompanyService" ADD CONSTRAINT "CompanyService_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyClient" ADD CONSTRAINT "CompanyClient_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
