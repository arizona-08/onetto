-- CreateEnum
CREATE TYPE "BridgePaymentLinkStatus" AS ENUM ('VALID', 'EXPIRED', 'REVOKED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "BridgePaymentTransactionStatus" AS ENUM ('CREA', 'ACTC', 'PDNG', 'ACSC', 'RJCT');

-- AlterTable
ALTER TABLE "BridgePaymentLink" ADD COLUMN     "linkStatus" "BridgePaymentLinkStatus",
ADD COLUMN     "paymentRequestId" TEXT,
ADD COLUMN     "paymentTransactionId" TEXT,
ADD COLUMN     "paymentTransactionStatus" "BridgePaymentTransactionStatus",
ALTER COLUMN "bridgePaymentLinkId" DROP NOT NULL;
