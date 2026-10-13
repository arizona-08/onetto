CREATE TABLE "AdminUserInvitation" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "subscriptionPlan" "SubscriptionPlan" NOT NULL,
    "discountPercent" INTEGER NOT NULL,
    "invitedById" TEXT NOT NULL,
    "userId" TEXT,
    "stripeCouponId" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "redeemedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminUserInvitation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AdminUserInvitation_email_key" ON "AdminUserInvitation"("email");
CREATE UNIQUE INDEX "AdminUserInvitation_tokenHash_key" ON "AdminUserInvitation"("tokenHash");
CREATE UNIQUE INDEX "AdminUserInvitation_userId_key" ON "AdminUserInvitation"("userId");
CREATE UNIQUE INDEX "AdminUserInvitation_stripeCouponId_key" ON "AdminUserInvitation"("stripeCouponId");
CREATE INDEX "AdminUserInvitation_expiresAt_idx" ON "AdminUserInvitation"("expiresAt");

ALTER TABLE "AdminUserInvitation"
ADD CONSTRAINT "AdminUserInvitation_invitedById_fkey"
FOREIGN KEY ("invitedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "AdminUserInvitation"
ADD CONSTRAINT "AdminUserInvitation_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
