ALTER TABLE "UserSubscription"
  ALTER COLUMN "customerId" DROP NOT NULL,
  ALTER COLUMN "subscriptionId" DROP NOT NULL;

INSERT INTO "UserSubscription" (
  "id",
  "userId",
  "subscriptionPlan",
  "isActive",
  "createdAt",
  "updatedAt"
)
SELECT
  md5('free-subscription:' || "User"."id"),
  "User"."id",
  COALESCE("User"."subscriptionPlan", 'FREE'::"SubscriptionPlan"),
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "User"
LEFT JOIN "UserSubscription"
  ON "UserSubscription"."userId" = "User"."id"
WHERE "User"."accountType" = 'BUSINESS_OWNER'
  AND "UserSubscription"."id" IS NULL;
