-- AlterTable
ALTER TABLE "InvoicePaymentMode" ADD COLUMN     "amountPerInstallmentInCents" INTEGER,
ADD COLUMN     "numberOfInstallments" INTEGER;
