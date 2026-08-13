/*
  Warnings:

  - Made the column `bridgePaymentLinkId` on table `BridgePaymentLinkSession` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "BridgePaymentLinkSession" ALTER COLUMN "bridgePaymentLinkId" SET NOT NULL;
