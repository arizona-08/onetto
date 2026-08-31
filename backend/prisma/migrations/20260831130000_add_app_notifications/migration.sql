CREATE TYPE "AppNotificationType" AS ENUM (
  'SUPPLIER_INVOICE_RECEIVED',
  'PAYMENT_SUBMITTED',
  'PAYMENT_SUCCEEDED',
  'PAYMENT_FAILED',
  'ESTIMATE_ACCEPTED',
  'ESTIMATE_RENEGOTIATED',
  'ESTIMATE_REJECTED'
);

CREATE TABLE "AppNotification" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "type" "AppNotificationType" NOT NULL,
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "href" TEXT,
  "deduplicationKey" TEXT NOT NULL,
  "metadata" JSONB,
  "readAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AppNotification_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AppNotification_userId_deduplicationKey_key" ON "AppNotification"("userId", "deduplicationKey");
CREATE INDEX "AppNotification_userId_readAt_createdAt_idx" ON "AppNotification"("userId", "readAt", "createdAt");
CREATE INDEX "AppNotification_companyId_createdAt_idx" ON "AppNotification"("companyId", "createdAt");
ALTER TABLE "AppNotification" ADD CONSTRAINT "AppNotification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AppNotification" ADD CONSTRAINT "AppNotification_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
