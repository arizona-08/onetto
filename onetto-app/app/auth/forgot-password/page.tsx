'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import AuthShell from '../AuthShell';
import { requestPasswordReset } from '@/lib/auth/auth';
import { ApiError } from '@/lib/api';

function getErrorMessage(error: ApiError): string {
  return Array.isArray(error.message) ? error.message.join(' ') : error.message;
}

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setError('');
    const result = await requestPasswordReset(email);
    setIsLoading(false);

    if (!result.ok) {
      setError(getErrorMessage(result.error));
      return;
    }

    setMessage(result.data.message);
  }

  return (
    <AuthShell title="Mot de passe oublié" subtitle="Saisissez votre adresse e-mail pour recevoir un lien de réinitialisation.">
      <form className="space-y-5" onSubmit={handleSubmit}>
        <div className="flex flex-col gap-2">
          <label htmlFor="email" className="font-title text-xs font-semibold uppercase tracking-wide text-zinc-600">Email</label>
          <input id="email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="vous@exemple.com" className="rounded-md border border-zinc-200 bg-custom-gray-light px-4 py-3 text-sm text-zinc-800 outline-none transition-colors focus:border-primary focus:bg-white" />
        </div>
        <button type="submit" disabled={isLoading} className="w-full rounded-md bg-primary px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-70">
          {isLoading ? 'Envoi en cours...' : 'Envoyer le lien'}
        </button>
        {message && <p className="rounded-md bg-green-50 px-4 py-3 text-sm text-green-700">{message}</p>}
        {error && <p className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      </form>
      <p className="mt-6 text-sm text-zinc-500"><Link href="/auth/login" className="font-semibold text-primary hover:text-primary-hover">Retour à la connexion</Link></p>
    </AuthShell>
  );
}
