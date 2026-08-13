-- Rename the fee amount to the public domain name and store whole cents.
ALTER TABLE "InvoicePaymentFee"
RENAME COLUMN "feeAmountInCents" TO "amountInCents";

ALTER TABLE "InvoicePaymentFee"
ALTER COLUMN "amountInCents" TYPE INTEGER USING ROUND("amountInCents")::INTEGER;

-- The payment method will be collected later; fees can already be calculated.
ALTER TABLE "InvoicePaymentFee"
ALTER COLUMN "paymentMethod" DROP NOT NULL;
