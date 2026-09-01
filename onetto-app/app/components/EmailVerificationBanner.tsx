'use client';

import { resendEmailVerification } from '@/lib/auth/auth';
import { useAuthUser } from './context/AuthUserContext';
import { useState } from 'react';

export default function EmailVerificationBanner() {
  const { user } = useAuthUser();
  const email = user?.email;
  const [isSending, setIsSending] = useState(false);
  const [feedback, setFeedback] = useState('');

  if (!user || user.emailVerifiedAt || !email) {
    return null;
  }

  async function handleResend() {
    if (!email) {
      return;
    }

    setIsSending(true);
    setFeedback('');
    const result = await resendEmailVerification(email);
    setIsSending(false);

    if (!result.ok) {
      setFeedback('Impossible d’envoyer l’e-mail pour le moment. Réessayez dans quelques instants.');
      return;
    }

    setFeedback('Un nouveau lien de confirmation vient d’être envoyé.');
  }

  return (
    <section className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 sm:px-6" role="status">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p>
          Votre adresse <strong>{user.email}</strong> n’est pas encore confirmée. Consultez votre boîte e-mail pour activer votre compte.
          {feedback && <span className="ml-1 font-medium">{feedback}</span>}
        </p>
        <button
          type="button"
          onClick={handleResend}
          disabled={isSending}
          className="shrink-0 self-start font-semibold underline decoration-amber-700 underline-offset-4 hover:text-amber-700 disabled:cursor-not-allowed disabled:opacity-60 sm:self-auto"
        >
          {isSending ? 'Envoi en cours…' : 'Renvoyer un mail de confirmation'}
        </button>
      </div>
    </section>
  );
}
