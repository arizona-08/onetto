-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CREDIT_CARD', 'BANK_TRANSFER', 'CHECK', 'CASH', 'OTHER');

-- AlterEnum
ALTER TYPE "InvoiceStatus" ADD VALUE 'PAID_MANUALLY';

-- CreateTable
CREATE TABLE "InvoicePaymentFee" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "feeAmountInCents" DOUBLE PRECISION NOT NULL,
    "paymentMethod" "PaymentMethod" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvoicePaymentFee_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InvoicePaymentFee_documentId_key" ON "InvoicePaymentFee"("documentId");

-- AddForeignKey
ALTER TABLE "InvoicePaymentFee" ADD CONSTRAINT "InvoicePaymentFee_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoicePaymentFee" ADD CONSTRAINT "InvoicePaymentFee_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
