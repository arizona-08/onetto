ALTER TABLE "AdminUserInvitation"
DROP CONSTRAINT "AdminUserInvitation_discountPercent_check";

ALTER TABLE "AdminUserInvitation"
ADD CONSTRAINT "AdminUserInvitation_discountPercent_check"
CHECK (
  ("subscriptionPlan" = 'FREE' AND "discountPercent" = 0)
  OR (
    "subscriptionPlan" <> 'FREE'
    AND "discountPercent" IN (5, 10, 15, 20, 25, 30, 35, 40)
  )
);

ALTER TABLE "AdminUserInvitation"
DROP CONSTRAINT "AdminUserInvitation_subscriptionPlan_check";

ALTER TABLE "AdminUserInvitation"
ADD CONSTRAINT "AdminUserInvitation_subscriptionPlan_check"
CHECK (
  "subscriptionPlan" IN (
    'FREE',
    'STARTER_MONTHLY',
    'STARTER_YEARLY',
    'PRO_MONTHLY',
    'PRO_YEARLY'
  )
);
