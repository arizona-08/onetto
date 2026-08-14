-- CreateTable
CREATE TABLE "BridgePaymentLink" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "bridgePaymentLinkId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BridgePaymentLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BridgePaymentLink_bridgePaymentLinkId_key" ON "BridgePaymentLink"("bridgePaymentLinkId");

-- AddForeignKey
ALTER TABLE "BridgePaymentLink" ADD CONSTRAINT "BridgePaymentLink_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;
