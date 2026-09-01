'use client';

import Link from 'next/link'
import { useRouter } from 'next/navigation';
import React from 'react'
import AuthShell from '../AuthShell'
import { login } from '@/lib/auth/auth';
import { ApiError } from '@/lib/api';
import { useAuthUser } from '@/app/components/context/AuthUserContext';

function getErrorMessage(error: ApiError): string {
  return Array.isArray(error.message) ? error.message.join(' ') : error.message;
}

function LoginPage() {
  const router = useRouter();
  const [error, setError] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);

  const {setUser} = useAuthUser();

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setIsLoading(true);

    const formData = new FormData(event.currentTarget);
    const result = await login({
      email: String(formData.get('email') || ''),
      password: String(formData.get('password') || ''),
    });

    setIsLoading(false);

    if (!result.ok) {
      setError(getErrorMessage(result.error));
      return;
    }

    const user = result.data.user;
    setUser(user);

    router.push('/dashboard');
  }

  return (
    <AuthShell
      title="Connexion"
      subtitle="Ravi de vous revoir. Connectez-vous pour retrouver votre espace de gestion."
    >
      <form className="space-y-5" onSubmit={handleSubmit}>
        <button
          type="button"
          className="flex w-full items-center justify-center gap-3 rounded-md border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold text-zinc-700 transition-colors hover:bg-custom-gray-light"
        >
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white font-title text-sm font-semibold text-primary">
            G
          </span>
          Continuer avec Google
        </button>

        <div className="flex items-center gap-4">
          <div className="h-px flex-1 bg-zinc-200"></div>
          <span className="text-xs text-zinc-400">ou</span>
          <div className="h-px flex-1 bg-zinc-200"></div>
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

        <div className="flex flex-col gap-2">
          <label htmlFor="password" className="font-title text-xs font-semibold uppercase tracking-wide text-zinc-600">
            Mot de passe
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            placeholder="Votre mot de passe"
            className="rounded-md border border-zinc-200 bg-custom-gray-light px-4 py-3 text-sm text-zinc-800 outline-none transition-colors focus:border-primary focus:bg-white"
          />
        </div>

        <div className="flex flex-col gap-3 text-sm text-zinc-500 sm:flex-row sm:items-center sm:justify-between">
          <label className="flex items-center gap-2">
            <input type="checkbox" className="h-4 w-4 rounded border-zinc-300 accent-primary" />
            Se souvenir de moi
          </label>
          <Link href="/auth/forgot-password" className="font-semibold text-primary hover:text-primary-hover">
            Mot de passe oublié ?
          </Link>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full rounded-md bg-primary px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isLoading ? 'Connexion...' : 'Se connecter'}
        </button>

        {error && (
          <p className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        )}
      </form>

      <p className="mt-6 text-sm text-zinc-500">
        Pas encore de compte ?{' '}
        <Link href="/auth/register" className="font-semibold text-primary hover:text-primary-hover">
          Créer un compte
        </Link>
      </p>
    </AuthShell>
  )
}

export default LoginPage
