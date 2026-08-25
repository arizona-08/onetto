-- AlterTable
ALTER TABLE "UserSubscription" ADD COLUMN     "canceledAtPeriodEnd" TIMESTAMP(3),
ADD COLUMN     "willCancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false;
