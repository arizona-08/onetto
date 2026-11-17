"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import AuthShell from "../AuthShell";
import { resendEmailVerification } from "@/lib/auth/auth";
import { ApiError } from "@/lib/api";
import { AuthFeedback } from "../AuthFormUI";

function getErrorMessage(error: ApiError): string {
  return Array.isArray(error.message) ? error.message.join(" ") : error.message;
}

function CheckEmailContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "";
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function resend() {
    if (!email) {
      setError(
        "Saisissez votre adresse e-mail depuis la page de connexion pour recevoir un nouveau lien.",
      );
      return;
    }

    setIsLoading(true);
    setError("");
    const result = await resendEmailVerification(email);
    setIsLoading(false);

    if (!result.ok) {
      setError(getErrorMessage(result.error));
      return;
    }

    setStatus(result.data.message);
  }

  return (
    <AuthShell
      appearance="modern"
      title="Confirmez votre e-mail"
      subtitle="Nous vous avons envoyé un lien d’activation."
    >
      <div className="space-y-5 text-sm text-ui-secondary">
        <p>
          Ouvrez l’e-mail envoyé à{" "}
          <strong className="font-semibold text-ui-text">
            {email || "votre adresse e-mail"}
          </strong>
          , puis cliquez sur le lien pour activer votre compte.
        </p>
        <button
          type="button"
          disabled={isLoading}
          onClick={resend}
          className="h-11 w-full rounded-ui-control border border-ui-primary bg-ui-surface px-4 font-semibold text-ui-primary transition-colors hover:bg-ui-primary-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ui-primary disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLoading ? "Envoi en cours..." : "Renvoyer l’e-mail"}
        </button>
        {status && <AuthFeedback kind="success">{status}</AuthFeedback>}
        {error && <AuthFeedback kind="error">{error}</AuthFeedback>}
        <p>
          Une fois votre adresse confirmée, vous pourrez{" "}
          <Link
            href="/auth/login"
            className="font-semibold text-ui-primary hover:text-ui-primary-hover focus-visible:outline-2 focus-visible:outline-ui-primary"
          >
            vous connecter
          </Link>
          .
        </p>
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
