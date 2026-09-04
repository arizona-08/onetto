'use client';

import Link from 'next/link'
import { useRouter } from 'next/navigation';
import React from 'react'
import AuthShell from '../AuthShell'
import { register } from '@/lib/auth/auth';
import { ApiError } from '@/lib/api';

function getErrorMessage(error: ApiError): string {
  return Array.isArray(error.message) ? error.message.join(' ') : error.message;
}

function RegisterPage() {
  const router = useRouter();
  const [error, setError] = React.useState('');
  const [success, setSuccess] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    const formData = new FormData(event.currentTarget);
    const registrationData = {
      firstname: String(formData.get('firstname') || ''),
      lastname: String(formData.get('lastname') || ''),
      email: String(formData.get('email') || ''),
      password: String(formData.get('password') || ''),
      confirmationPassword: String(formData.get('confirmationPassword') || ''),
    };
    const result = await register(registrationData);

    if (!result.ok) {
      setError(getErrorMessage(result.error));
      setIsLoading(false);
      return;
    }

    setIsLoading(false);
    setSuccess('Votre compte a été créé. Vérifiez votre boîte e-mail pour l’activer.');
    setTimeout(() => router.push(`/auth/check-email?email=${encodeURIComponent(registrationData.email)}`), 900);
  }

  return (
    <AuthShell
      title="Créer un compte"
      subtitle="Commencez à organiser vos factures, vos clients et votre catalogue de services."
    >
      <form className="space-y-5" onSubmit={handleSubmit}>
        <button
          type="button"
          className="flex w-full items-center justify-center gap-3 rounded-md border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold text-zinc-700 transition-colors hover:bg-custom-gray-light"
        >
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white font-title text-sm font-semibold text-primary">
            G
          </span>
          S'inscrire avec Google
        </button>

        <div className="flex items-center gap-4">
          <div className="h-px flex-1 bg-zinc-200"></div>
          <span className="text-xs text-zinc-400">ou</span>
          <div className="h-px flex-1 bg-zinc-200"></div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <label htmlFor="firstname" className="font-title text-xs font-semibold uppercase tracking-wide text-zinc-600">
              Prénom
            </label>
            <input
              id="firstname"
              name="firstname"
              type="text"
              required
              placeholder="Jean"
              className="rounded-md border border-zinc-200 bg-custom-gray-light px-4 py-3 text-sm text-zinc-800 outline-none transition-colors focus:border-primary focus:bg-white"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="lastname" className="font-title text-xs font-semibold uppercase tracking-wide text-zinc-600">
              Nom
            </label>
            <input
              id="lastname"
              name="lastname"
              type="text"
              required
              placeholder="Dupont"
              className="rounded-md border border-zinc-200 bg-custom-gray-light px-4 py-3 text-sm text-zinc-800 outline-none transition-colors focus:border-primary focus:bg-white"
            />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="email" className="font-title text-xs font-semibold uppercase tracking-wide text-zinc-600">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            placeholder="vous@exemple.com"
            className="rounded-md border border-zinc-200 bg-custom-gray-light px-4 py-3 text-sm text-zinc-800 outline-none transition-colors focus:border-primary focus:bg-white"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <label htmlFor="password" className="font-title text-xs font-semibold uppercase tracking-wide text-zinc-600">
              Mot de passe
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              placeholder="Minimum 8 caractères"
              className="rounded-md border border-zinc-200 bg-custom-gray-light px-4 py-3 text-sm text-zinc-800 outline-none transition-colors focus:border-primary focus:bg-white"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="confirmationPassword" className="font-title text-xs font-semibold uppercase tracking-wide text-zinc-600">
              Confirmation
            </label>
            <input
              id="confirmationPassword"
              name="confirmationPassword"
              type="password"
              required
              placeholder="Confirmer"
              className="rounded-md border border-zinc-200 bg-custom-gray-light px-4 py-3 text-sm text-zinc-800 outline-none transition-colors focus:border-primary focus:bg-white"
            />
          </div>
        </div>

        <label className="flex items-start gap-2 text-xs leading-5 text-zinc-500">
          <input type="checkbox" required className="mt-1 h-4 w-4 rounded border-zinc-300 accent-primary" />
          <span>
            J'accepte les <Link href="/legal#CGU" className="text-primary font-medium hover:text-primary-hover underline">
              conditions d'utilisation
            </Link> et la <Link href="/legal#politique-de-confidentialite" className="text-primary font-medium hover:text-primary-hover underline">
              politique de confidentialité
            </Link> d'Onetto.
          </span>
        </label>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full rounded-md bg-primary px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isLoading ? 'Création...' : 'Créer mon compte'}
        </button>

        {error && (
          <p className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        )}

        {success && (
          <p className="rounded-md bg-green-50 px-4 py-3 text-sm text-green-700">
            {success}
          </p>
        )}
      </form>

      <p className="mt-6 text-sm text-zinc-500">
        Déjà un compte ?{' '}
        <Link href="/auth/login" className="font-semibold text-primary hover:text-primary-hover">
          Se connecter
        </Link>
      </p>
    </AuthShell>
  )
}

export default RegisterPage
