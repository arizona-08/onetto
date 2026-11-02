CREATE TABLE "AdminSubscriptionUpgrade" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "stripeSubscriptionId" TEXT NOT NULL,
  "previousPlan" "SubscriptionPlan" NOT NULL,
  "targetPlan" "SubscriptionPlan" NOT NULL,
  "stripeInvoiceId" TEXT,
  "emailSentAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "AdminSubscriptionUpgrade_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AdminSubscriptionUpgrade_stripeInvoiceId_key"
  ON "AdminSubscriptionUpgrade"("stripeInvoiceId");

CREATE INDEX "AdminSubscriptionUpgrade_stripeSubscriptionId_targetPlan_emailSentAt_idx"
  ON "AdminSubscriptionUpgrade"("stripeSubscriptionId", "targetPlan", "emailSentAt");

ALTER TABLE "AdminSubscriptionUpgrade"
  ADD CONSTRAINT "AdminSubscriptionUpgrade_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
