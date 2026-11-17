"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import AuthShell from "../AuthShell";
import { confirmEmail } from "@/lib/auth/auth";
import { ApiError } from "@/lib/api";

function getErrorMessage(error: ApiError): string {
  return Array.isArray(error.message) ? error.message.join(" ") : error.message;
}

function ConfirmEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [message, setMessage] = useState(
    "Confirmation de votre adresse e-mail…",
  );
  const [isConfirmed, setIsConfirmed] = useState(false);

  useEffect(() => {
    if (!token) {
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
    <AuthShell
      appearance="modern"
      title={isConfirmed ? "Adresse confirmée" : "Confirmation de l’e-mail"}
      subtitle={token ? message : "Ce lien de confirmation est incomplet. Demandez-en un nouveau."}
    >
      <Link
        href={isConfirmed ? "/auth/login" : "/auth/check-email"}
        className="flex h-11 w-full items-center justify-center rounded-ui-control bg-ui-primary px-4 text-center text-sm font-semibold text-white shadow-ui-card transition-colors hover:bg-ui-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ui-primary"
      >
        {isConfirmed ? "Se connecter" : "Demander un nouveau lien"}
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
