-- CreateEnum
CREATE TYPE "ReminderType" AS ENUM ('ESTIMATE_PENDING', 'INVOICE_BEFORE_DUE_DATE', 'INVOICE_OVERDUE_FIRST', 'INVOICE_OVERDUE_SECOND');

-- CreateTable
CREATE TABLE "ProcessedReminders" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "reminderType" "ReminderType" NOT NULL,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProcessedReminders_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProcessedReminders_documentId_reminderType_key" ON "ProcessedReminders"("documentId", "reminderType");

-- AddForeignKey
ALTER TABLE "ProcessedReminders" ADD CONSTRAINT "ProcessedReminders_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
