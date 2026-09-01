'use client';

import Link from 'next/link';
import { FormEvent, Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import AuthShell from '../AuthShell';
import { resetPassword } from '@/lib/auth/auth';
import { ApiError } from '@/lib/api';

function getErrorMessage(error: ApiError): string {
  return Array.isArray(error.message) ? error.message.join(' ') : error.message;
}

function ResetPasswordContent() {
  const token = useSearchParams().get('token');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) {
      setError('Ce lien de réinitialisation est incomplet.');
      return;
    }

    const formData = new FormData(event.currentTarget);
    setIsLoading(true);
    setError('');
    const result = await resetPassword(token, String(formData.get('password') ?? ''), String(formData.get('confirmationPassword') ?? ''));
    setIsLoading(false);

    if (!result.ok) {
      setError(getErrorMessage(result.error));
      return;
    }

    setMessage(result.data.message);
  }

  return (
    <AuthShell title="Nouveau mot de passe" subtitle="Choisissez un mot de passe sécurisé d’au moins 8 caractères.">
      {message ? (
        <div className="space-y-5"><p className="rounded-md bg-green-50 px-4 py-3 text-sm text-green-700">{message}</p><Link href="/auth/login" className="block w-full rounded-md bg-primary px-4 py-3 text-center text-sm font-semibold text-white hover:bg-primary-hover">Se connecter</Link></div>
      ) : (
        <form className="space-y-5" onSubmit={handleSubmit}>
          <PasswordField id="password" label="Nouveau mot de passe" />
          <PasswordField id="confirmationPassword" label="Confirmer le mot de passe" />
          <button type="submit" disabled={isLoading || !token} className="w-full rounded-md bg-primary px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-70">{isLoading ? 'Réinitialisation...' : 'Réinitialiser le mot de passe'}</button>
          {error && <p className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
        </form>
      )}
    </AuthShell>
  );
}

function PasswordField({ id, label }: { id: string; label: string }) {
  return <div className="flex flex-col gap-2"><label htmlFor={id} className="font-title text-xs font-semibold uppercase tracking-wide text-zinc-600">{label}</label><input id={id} name={id} type="password" minLength={8} required className="rounded-md border border-zinc-200 bg-custom-gray-light px-4 py-3 text-sm text-zinc-800 outline-none transition-colors focus:border-primary focus:bg-white" /></div>;
}

export default function ResetPasswordPage() {
  return <Suspense fallback={null}><ResetPasswordContent /></Suspense>;
}
