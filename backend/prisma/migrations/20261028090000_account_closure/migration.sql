ALTER TABLE "User" ADD COLUMN "closedAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "profileMinimizedAt" TIMESTAMP(3);
ALTER TABLE "Company" ADD COLUMN "closedByAccountClosureAt" TIMESTAMP(3);
ALTER TABLE "AppNotification" ADD COLUMN "emailSentAt" TIMESTAMP(3);

ALTER TYPE "AppNotificationType" ADD VALUE 'COMPANY_CLOSED';

CREATE TYPE "AccountClosureStatus" AS ENUM ('PENDING', 'WAITING_SETTLEMENT', 'ACTION_REQUIRED', 'COMPLETED');

CREATE TABLE "AccountClosure" (
    "userId" TEXT NOT NULL,
    "status" "AccountClosureStatus" NOT NULL DEFAULT 'PENDING',
    "pendingActions" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "reviewedActions" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastAttemptAt" TIMESTAMP(3),
    "processingAt" TIMESTAMP(3),
    "nextAttemptAt" TIMESTAMP(3),
    "lastError" TEXT,
    "completedAt" TIMESTAMP(3),
    CONSTRAINT "AccountClosure_pkey" PRIMARY KEY ("userId")
);

CREATE INDEX "AccountClosure_status_nextAttemptAt_idx" ON "AccountClosure"("status", "nextAttemptAt");

ALTER TABLE "AccountClosure" ADD CONSTRAINT "AccountClosure_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
