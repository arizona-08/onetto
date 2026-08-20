/*
  Warnings:

  - The values [INSTALLMENTS] on the enum `PaymentMode` will be removed. If these variants are still used in the database, this will fail.

*/
-- CreateEnum
CREATE TYPE "PaymentModeFrequency" AS ENUM ('BIWEEKLY', 'MONTHLY');

-- AlterEnum
BEGIN;
CREATE TYPE "PaymentMode_new" AS ENUM ('ONE_TIME', 'INSTALMENTS');
ALTER TABLE "public"."InvoicePaymentMode" ALTER COLUMN "paymentMode" DROP DEFAULT;
ALTER TABLE "InvoicePaymentMode" ALTER COLUMN "paymentMode" TYPE "PaymentMode_new" USING ("paymentMode"::text::"PaymentMode_new");
ALTER TYPE "PaymentMode" RENAME TO "PaymentMode_old";
ALTER TYPE "PaymentMode_new" RENAME TO "PaymentMode";
DROP TYPE "public"."PaymentMode_old";
ALTER TABLE "InvoicePaymentMode" ALTER COLUMN "paymentMode" SET DEFAULT 'ONE_TIME';
COMMIT;

-- AlterTable
ALTER TABLE "InvoicePaymentMode" ADD COLUMN     "paymentModeFrequency" "PaymentModeFrequency";
