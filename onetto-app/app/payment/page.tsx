import { getPublicPaymentServer } from '@/lib/documents/document.server';
import PaymentSummary from './PaymentSummary';

export const dynamic = 'force-dynamic';

export default async function PaymentPage({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const token = typeof params.token === 'string' ? params.token : undefined;

  if (!token) {
    return <PaymentError message="Lien de paiement invalide ou requis." />;
  }

  const response = await getPublicPaymentServer(token);
  if (!response.ok) {
    return <PaymentError message="Ce lien de paiement est invalide ou expiré." />;
  }

  return <PaymentSummary payment={response.data} />;
}

function PaymentError({ message }: { message: string }) {
  return (
    <main className="grid min-h-screen place-items-center bg-zinc-50 p-6">
      <p className="rounded-xl bg-white px-5 py-4 text-sm text-zinc-600">{message}</p>
    </main>
  );
}
