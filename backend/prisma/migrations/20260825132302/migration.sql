/*
  Warnings:

  - The values [PREMIUM,PRO] on the enum `SubscriptionPlan` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "SubscriptionPlan_new" AS ENUM ('FREE', 'STARTER_MONTHLY', 'STARTER_YEARLY', 'PRO_MONTHLY', 'PRO_YEARLY');
ALTER TABLE "public"."UserSubscription" ALTER COLUMN "subscriptionPlan" DROP DEFAULT;
ALTER TABLE "User" ALTER COLUMN "subscriptionPlan" TYPE "SubscriptionPlan_new" USING ("subscriptionPlan"::text::"SubscriptionPlan_new");
ALTER TABLE "UserSubscription" ALTER COLUMN "subscriptionPlan" TYPE "SubscriptionPlan_new" USING ("subscriptionPlan"::text::"SubscriptionPlan_new");
ALTER TABLE "UserSubscriptionHistory" ALTER COLUMN "subscriptionPlan" TYPE "SubscriptionPlan_new" USING ("subscriptionPlan"::text::"SubscriptionPlan_new");
ALTER TYPE "SubscriptionPlan" RENAME TO "SubscriptionPlan_old";
ALTER TYPE "SubscriptionPlan_new" RENAME TO "SubscriptionPlan";
DROP TYPE "public"."SubscriptionPlan_old";
ALTER TABLE "UserSubscription" ALTER COLUMN "subscriptionPlan" SET DEFAULT 'FREE';
COMMIT;
