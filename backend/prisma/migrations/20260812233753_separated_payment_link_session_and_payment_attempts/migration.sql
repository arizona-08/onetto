/*
  Warnings:

  - You are about to drop the `BridgePaymentLink` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "BridgePaymentLink" DROP CONSTRAINT "BridgePaymentLink_documentId_fkey";

-- DropTable
DROP TABLE "BridgePaymentLink";

-- CreateTable
CREATE TABLE "BridgePaymentLinkSession" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "bridgePaymentLinkId" TEXT,
    "linkStatus" "BridgePaymentLinkStatus",
    "url" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BridgePaymentLinkSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BridgePaymentAttempt" (
    "id" TEXT NOT NULL,
    "bridgePaymentLinkSessionId" TEXT NOT NULL,
    "paymentRequestId" TEXT,
    "paymentTransactionId" TEXT,
    "paymentTransactionStatus" "BridgePaymentTransactionStatus",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BridgePaymentAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BridgePaymentLinkSession_bridgePaymentLinkId_key" ON "BridgePaymentLinkSession"("bridgePaymentLinkId");

-- AddForeignKey
ALTER TABLE "BridgePaymentLinkSession" ADD CONSTRAINT "BridgePaymentLinkSession_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BridgePaymentAttempt" ADD CONSTRAINT "BridgePaymentAttempt_bridgePaymentLinkSessionId_fkey" FOREIGN KEY ("bridgePaymentLinkSessionId") REFERENCES "BridgePaymentLinkSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
