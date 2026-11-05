-- CreateEnum
CREATE TYPE "ContractMandateStatus" AS ENUM ('NOT_REQUESTED', 'PENDING', 'ACTIVE', 'FAILED', 'REVOKED');

-- CreateEnum
CREATE TYPE "ContractStageKind" AS ENUM ('DEPOSIT', 'BALANCE');

-- CreateEnum
CREATE TYPE "ContractStagePaymentStatus" AS ENUM ('RESERVED', 'CREATING', 'UNCERTAIN', 'PENDING', 'IN_PROGRESS', 'SUCCESS', 'FAILED', 'CANCELLED');

-- AlterEnum
ALTER TYPE "AppNotificationType" ADD VALUE 'CONTRACT_MANDATE_ACTIVE';

-- AlterTable
ALTER TABLE "EstimateNegociation" ADD COLUMN     "proposedPaymentStages" JSONB;

-- AlterTable
ALTER TABLE "ElectronicInvoiceEvent" ADD COLUMN "sourceReference" TEXT;

-- CreateTable
CREATE TABLE "ContractPaymentPlan" (
    "id" TEXT NOT NULL,
    "estimateId" TEXT NOT NULL,
    "totalAmountInCents" INTEGER NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "authorizationToken" TEXT NOT NULL,
    "authorizationExpiresAt" TIMESTAMP(3),
    "providerBillingRequestId" TEXT,
    "providerFlowId" TEXT,
    "providerFlowUrl" TEXT,
    "providerFlowExpiresAt" TIMESTAMP(3),
    "providerMandateId" TEXT,
    "mandateStatus" "ContractMandateStatus" NOT NULL DEFAULT 'NOT_REQUESTED',
    "cancelledAt" TIMESTAMP(3),

    CONSTRAINT "ContractPaymentPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContractPaymentStage" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "kind" "ContractStageKind" NOT NULL,
    "percentage" INTEGER NOT NULL,
    "amountInCents" INTEGER NOT NULL,
    "triggerCondition" TEXT NOT NULL,
    "invoiceId" TEXT,
    "cancelledAt" TIMESTAMP(3),

    CONSTRAINT "ContractPaymentStage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContractStagePayment" (
    "id" TEXT NOT NULL,
    "stageId" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "providerPaymentId" TEXT,
    "status" "ContractStagePaymentStatus" NOT NULL DEFAULT 'RESERVED',
    "amountInCents" INTEGER NOT NULL,
    "chargeDate" TIMESTAMP(3),
    "failureReason" TEXT,
    "requestedByUserId" TEXT,
    "lastReconciledAt" TIMESTAMP(3),
    "automaticRetryScheduled" BOOLEAN NOT NULL DEFAULT false,
    "manualRetryRequestedAt" TIMESTAMP(3),
    "manualSettlementAt" TIMESTAMP(3),
    "manualSettlementByUserId" TEXT,
    "needsAccountingReview" BOOLEAN NOT NULL DEFAULT false,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContractStagePayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ContractPaymentPlan_estimateId_key" ON "ContractPaymentPlan"("estimateId");

-- CreateIndex
CREATE UNIQUE INDEX "ContractPaymentPlan_authorizationToken_key" ON "ContractPaymentPlan"("authorizationToken");

-- CreateIndex
CREATE UNIQUE INDEX "ContractPaymentPlan_providerBillingRequestId_key" ON "ContractPaymentPlan"("providerBillingRequestId");

-- CreateIndex
CREATE UNIQUE INDEX "ContractPaymentPlan_providerMandateId_key" ON "ContractPaymentPlan"("providerMandateId");

-- CreateIndex
CREATE INDEX "ContractPaymentPlan_providerBillingRequestId_idx" ON "ContractPaymentPlan"("providerBillingRequestId");

-- CreateIndex
CREATE UNIQUE INDEX "ContractPaymentStage_invoiceId_key" ON "ContractPaymentStage"("invoiceId");

-- CreateIndex
CREATE UNIQUE INDEX "ContractPaymentStage_planId_sequence_key" ON "ContractPaymentStage"("planId", "sequence");

-- CreateIndex
CREATE UNIQUE INDEX "ContractStagePayment_stageId_key" ON "ContractStagePayment"("stageId");

-- CreateIndex
CREATE UNIQUE INDEX "ElectronicInvoiceEvent_transmissionId_sourceReference_key" ON "ElectronicInvoiceEvent"("transmissionId", "sourceReference");

-- CreateIndex
CREATE UNIQUE INDEX "ContractStagePayment_idempotencyKey_key" ON "ContractStagePayment"("idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "ContractStagePayment_providerPaymentId_key" ON "ContractStagePayment"("providerPaymentId");

-- CreateIndex
CREATE INDEX "ContractStagePayment_status_requestedAt_idx" ON "ContractStagePayment"("status", "requestedAt");

-- AddForeignKey
ALTER TABLE "ContractPaymentPlan" ADD CONSTRAINT "ContractPaymentPlan_estimateId_fkey" FOREIGN KEY ("estimateId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractPaymentStage" ADD CONSTRAINT "ContractPaymentStage_planId_fkey" FOREIGN KEY ("planId") REFERENCES "ContractPaymentPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractPaymentStage" ADD CONSTRAINT "ContractPaymentStage_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Document"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractStagePayment" ADD CONSTRAINT "ContractStagePayment_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "ContractPaymentStage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
