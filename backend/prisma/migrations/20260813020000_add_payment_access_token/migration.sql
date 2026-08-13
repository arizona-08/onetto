ALTER TABLE "BridgePaymentLinkSession" ADD COLUMN "paymentAccessToken" TEXT;

UPDATE "BridgePaymentLinkSession"
SET "paymentAccessToken" = md5(random()::text || clock_timestamp()::text || "id");

ALTER TABLE "BridgePaymentLinkSession" ALTER COLUMN "paymentAccessToken" SET NOT NULL;

CREATE UNIQUE INDEX "BridgePaymentLinkSession_paymentAccessToken_key"
ON "BridgePaymentLinkSession"("paymentAccessToken");
