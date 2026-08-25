/*
  Warnings:

  - A unique constraint covering the columns `[customerId]` on the table `UserSubscription` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "UserSubscription_customerId_key" ON "UserSubscription"("customerId");
