'use client';

import Link from 'next/link';
import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import AuthShell from '../AuthShell';
import { resendEmailVerification } from '@/lib/auth/auth';
import { ApiError } from '@/lib/api';

function getErrorMessage(error: ApiError): string {
  return Array.isArray(error.message) ? error.message.join(' ') : error.message;
}

function CheckEmailContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get('email') ?? '';
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  async function resend() {
    if (!email) {
      setError('Saisissez votre adresse e-mail depuis la page de connexion pour recevoir un nouveau lien.');
      return;
    }

    setIsLoading(true);
    setError('');
    const result = await resendEmailVerification(email);
    setIsLoading(false);

    if (!result.ok) {
      setError(getErrorMessage(result.error));
      return;
    }

    setStatus(result.data.message);
  }

  return (
    <AuthShell title="Confirmez votre e-mail" subtitle="Nous vous avons envoyé un lien d’activation.">
      <div className="space-y-5 text-sm text-zinc-600">
        <p>
          Ouvrez l’e-mail envoyé à <strong className="text-zinc-800">{email || 'votre adresse e-mail'}</strong>, puis cliquez sur le lien pour activer votre compte.
        </p>
        <button
          type="button"
          disabled={isLoading}
          onClick={resend}
          className="w-full rounded-md border border-primary px-4 py-3 font-semibold text-primary transition-colors hover:bg-primary hover:text-white disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isLoading ? 'Envoi en cours...' : 'Renvoyer l’e-mail'}
        </button>
        {status && <p className="rounded-md bg-green-50 px-4 py-3 text-green-700">{status}</p>}
        {error && <p className="rounded-md bg-red-50 px-4 py-3 text-red-700">{error}</p>}
        <p>Une fois votre adresse confirmée, vous pourrez <Link href="/auth/login" className="font-semibold text-primary hover:text-primary-hover">vous connecter</Link>.</p>
      </div>
    </AuthShell>
  );
}

export default function CheckEmailPage() {
  return (
    <Suspense fallback={null}>
      <CheckEmailContent />
    </Suspense>
  );
}
