-- AlterTable
ALTER TABLE "InvoicePaymentLinkSession" ADD COLUMN     "provider" "PaymentProvider" NOT NULL DEFAULT 'BRIDGE';
