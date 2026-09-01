'use client';

import Link from 'next/link';
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import AuthShell from '../AuthShell';
import { confirmEmail } from '@/lib/auth/auth';
import { ApiError } from '@/lib/api';

function getErrorMessage(error: ApiError): string {
  return Array.isArray(error.message) ? error.message.join(' ') : error.message;
}

function ConfirmEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [message, setMessage] = useState('Confirmation de votre adresse e-mail…');
  const [isConfirmed, setIsConfirmed] = useState(false);

  useEffect(() => {
    if (!token) {
      setMessage('Ce lien de confirmation est incomplet. Demandez-en un nouveau.');
      return;
    }

    void confirmEmail(token).then((result) => {
      if (!result.ok) {
        setMessage(getErrorMessage(result.error));
        return;
      }
      setIsConfirmed(true);
      setMessage(result.data.message);
    });
  }, [token]);

  return (
    <AuthShell title={isConfirmed ? 'Adresse confirmée' : 'Confirmation de l’e-mail'} subtitle={message}>
      <Link
        href={isConfirmed ? '/auth/login' : '/auth/check-email'}
        className="block w-full rounded-md bg-primary px-4 py-3 text-center text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
      >
        {isConfirmed ? 'Se connecter' : 'Demander un nouveau lien'}
      </Link>
    </AuthShell>
  );
}

export default function ConfirmEmailPage() {
  return (
    <Suspense fallback={null}>
      <ConfirmEmailContent />
    </Suspense>
  );
}
