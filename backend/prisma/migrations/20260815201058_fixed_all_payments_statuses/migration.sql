/*
  Warnings:

  - The values [PAID] on the enum `InvoicePaymentInstallmentStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
ALTER TYPE "InvoicePaymentAttemptStatus" ADD VALUE 'PAYMENT_IN_PROGRESS';

-- AlterEnum
BEGIN;
CREATE TYPE "InvoicePaymentInstallmentStatus_new" AS ENUM ('PENDING', 'PAYMENT_IN_PROGRESS', 'SUCCESS', 'FAILED', 'OVERDUE');
ALTER TABLE "public"."InvoicePaymentInstallment" ALTER COLUMN "installmentStatus" DROP DEFAULT;
ALTER TABLE "InvoicePaymentInstallment" ALTER COLUMN "installmentStatus" TYPE "InvoicePaymentInstallmentStatus_new" USING ("installmentStatus"::text::"InvoicePaymentInstallmentStatus_new");
ALTER TYPE "InvoicePaymentInstallmentStatus" RENAME TO "InvoicePaymentInstallmentStatus_old";
ALTER TYPE "InvoicePaymentInstallmentStatus_new" RENAME TO "InvoicePaymentInstallmentStatus";
DROP TYPE "public"."InvoicePaymentInstallmentStatus_old";
ALTER TABLE "InvoicePaymentInstallment" ALTER COLUMN "installmentStatus" SET DEFAULT 'PENDING';
COMMIT;

-- AlterEnum
ALTER TYPE "InvoicePaymentStatus" ADD VALUE 'PAYMENT_IN_PROGRESS';
