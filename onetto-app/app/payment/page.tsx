import { getPublicPaymentServer } from "@/lib/documents/document.server";
import PaymentSummary from "./PaymentSummary";

export const dynamic = "force-dynamic";

export default async function PaymentPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const token = typeof params.token === "string" ? params.token : undefined;

  if (!token) {
    return <PaymentError message="Lien de paiement invalide ou requis." />;
  }

  const response = await getPublicPaymentServer(token);
  if (!response.ok) {
    return (
      <PaymentError message="Ce lien de paiement est invalide ou expiré." />
    );
  }

  return <PaymentSummary payment={response.data} token={token} />;
}

function PaymentError({ message }: { message: string }) {
  return (
    <main className="grid min-h-dvh place-items-center bg-ui-background p-6">
      <p role="alert" className="rounded-ui-card border border-ui-border bg-ui-surface px-6 py-5 text-sm text-ui-secondary shadow-ui-card">
        {message}
      </p>
    </main>
  );
}
