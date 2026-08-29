ALTER TYPE "ReminderType" ADD VALUE 'INSTALMENT_MANDATE_AFTER_ISSUE';
ALTER TYPE "ReminderType" ADD VALUE 'INSTALMENT_MANDATE_BEFORE_AUTHORIZATION_DEADLINE';
ALTER TYPE "ReminderType" ADD VALUE 'INSTALMENT_PAYMENT_OVERDUE';

ALTER TABLE "InvoiceInstalmentPlan"
ADD COLUMN "authorizationDeadline" TIMESTAMP(3);

UPDATE "InvoiceInstalmentPlan"
SET "authorizationDeadline" = "startDate" - INTERVAL '5 days';

ALTER TABLE "InvoiceInstalmentPlan"
ALTER COLUMN "authorizationDeadline" SET NOT NULL;

CREATE TABLE "ProcessedInstalmentReminder" (
    "id" TEXT NOT NULL,
    "instalmentId" TEXT NOT NULL,
    "reminderType" "ReminderType" NOT NULL,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProcessedInstalmentReminder_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProcessedInstalmentReminder_instalmentId_reminderType_key"
ON "ProcessedInstalmentReminder"("instalmentId", "reminderType");

ALTER TABLE "ProcessedInstalmentReminder"
ADD CONSTRAINT "ProcessedInstalmentReminder_instalmentId_fkey"
FOREIGN KEY ("instalmentId") REFERENCES "InvoicePaymentInstalment"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
