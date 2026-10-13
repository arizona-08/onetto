import { redirect } from "next/navigation";

function SubscriptionSuccessPage() {
  redirect("/settings/my-subscription");
}

export default SubscriptionSuccessPage;
