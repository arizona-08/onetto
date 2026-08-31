'use client';

import { useRouter } from 'next/navigation';

type GoCardlessReconnectModalProps = {
  companyId: string;
  onClose: () => void;
};

export default function GoCardlessReconnectModal({
  companyId,
  onClose,
}: GoCardlessReconnectModalProps) {
  const router = useRouter();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="gocardless-reconnect-title"
    >
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <h2 id="gocardless-reconnect-title" className="font-title text-xl font-semibold text-zinc-900">
          Reconnectez votre compte GoCardless
        </h2>
        <p className="mt-3 text-sm leading-6 text-zinc-600">
          La connexion GoCardless de cette entreprise n’est plus active. Aucun
          lien de paiement n’a été envoyé au client.
        </p>
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
          >
            Fermer
          </button>
          <button
            type="button"
            onClick={() => router.push(`/my-companies/${companyId}`)}
            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover"
          >
            Reconnecter GoCardless
          </button>
        </div>
      </div>
    </div>
  );
}
