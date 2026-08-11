-- CreateEnum
CREATE TYPE "EstimateNegociationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');

-- CreateTable
CREATE TABLE "EstimateNegociation" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "proposedTotalPrice" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "negociationToken" TEXT NOT NULL,

    CONSTRAINT "EstimateNegociation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EstimateNegociation_negociationToken_key" ON "EstimateNegociation"("negociationToken");

-- AddForeignKey
ALTER TABLE "EstimateNegociation" ADD CONSTRAINT "EstimateNegociation_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;
