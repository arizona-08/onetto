ALTER TABLE "AdminUserInvitation"
ADD CONSTRAINT "AdminUserInvitation_discountPercent_check"
CHECK ("discountPercent" IN (5, 10, 15, 20, 25, 30, 35, 40));

ALTER TABLE "AdminUserInvitation"
ADD CONSTRAINT "AdminUserInvitation_subscriptionPlan_check"
CHECK ("subscriptionPlan" IN ('PRO_MONTHLY', 'PRO_YEARLY'));
