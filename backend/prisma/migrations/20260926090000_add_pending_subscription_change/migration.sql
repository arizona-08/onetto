ALTER TABLE "UserSubscription"
ADD COLUMN "pendingSubscriptionPlan" "SubscriptionPlan",
ADD COLUMN "pendingPlanEffectiveAt" TIMESTAMP(3),
ADD COLUMN "pendingStripeScheduleId" TEXT;

CREATE UNIQUE INDEX "UserSubscription_pendingStripeScheduleId_key"
ON "UserSubscription"("pendingStripeScheduleId");
