-- CreateEnum
CREATE TYPE "PaymentMode" AS ENUM ('ONE_TIME', 'INSTALLMENTS');

-- CreateTable
CREATE TABLE "InvoicePaymentMode" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "paymentMode" "PaymentMode" NOT NULL DEFAULT 'ONE_TIME',

    CONSTRAINT "InvoicePaymentMode_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InvoicePaymentMode_invoiceId_key" ON "InvoicePaymentMode"("invoiceId");

-- AddForeignKey
ALTER TABLE "InvoicePaymentMode" ADD CONSTRAINT "InvoicePaymentMode_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;
