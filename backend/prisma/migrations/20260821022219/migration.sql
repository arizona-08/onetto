/*
  Warnings:

  - The values [BIWEEKLY] on the enum `PaymentModeFrequency` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "PaymentModeFrequency_new" AS ENUM ('WEEKLY', 'MONTHLY', 'YEARLY');
ALTER TABLE "InvoicePaymentMode" ALTER COLUMN "paymentModeFrequency" TYPE "PaymentModeFrequency_new" USING ("paymentModeFrequency"::text::"PaymentModeFrequency_new");
ALTER TYPE "PaymentModeFrequency" RENAME TO "PaymentModeFrequency_old";
ALTER TYPE "PaymentModeFrequency_new" RENAME TO "PaymentModeFrequency";
DROP TYPE "public"."PaymentModeFrequency_old";
COMMIT;
