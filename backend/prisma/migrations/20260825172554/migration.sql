-- CreateTable
CREATE TABLE "ProcessedStripeWebhookEvents" (
    "id" TEXT NOT NULL,
    "providerEventId" TEXT NOT NULL,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProcessedStripeWebhookEvents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProcessedStripeWebhookEvents_providerEventId_key" ON "ProcessedStripeWebhookEvents"("providerEventId");
