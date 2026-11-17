"use client";

import { useAuthUser } from "@/app/components/context/AuthUserContext";
import { ApiError } from "@/lib/api";
import { login } from "@/lib/auth/auth";
import { LockKeyhole, Mail } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React from "react";
import { AuthDivider, AuthFeedback, AuthFooter, AuthGoogleButton, AuthInput, AuthSubmitButton } from "../AuthFormUI";

function getErrorMessage(error: ApiError): string {
  return Array.isArray(error.message) ? error.message.join(" ") : error.message;
}

export default function LoginForm() {
  const router = useRouter();
  const { setUser } = useAuthUser();
  const [error, setError] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsLoading(true);

    const formData = new FormData(event.currentTarget);
    const result = await login({
      email: String(formData.get("email") || ""),
      password: String(formData.get("password") || ""),
    });

    setIsLoading(false);
    if (!result.ok) {
      setError(getErrorMessage(result.error));
      return;
    }

    const user = result.data.user;
    setUser(user);
    router.push(user.appUserRole === "USER" ? "/dashboard" : "/admin");
  }

  return (
    <>
      <form className="space-y-5" onSubmit={handleSubmit}>
        <AuthGoogleButton label="Continuer avec Google" />
        <AuthDivider />
        <AuthInput id="email" name="email" label="Email" icon={Mail} type="email" required autoComplete="email" placeholder="votre@email.com" />
        <AuthInput id="password" name="password" label="Mot de passe" icon={LockKeyhole} type="password" required autoComplete="current-password" placeholder="Votre mot de passe" />

        <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-ui-secondary">
          <label className="flex cursor-pointer items-center gap-2">
            <input type="checkbox" className="h-4 w-4 rounded border-ui-border accent-ui-primary" />
            Se souvenir de moi
          </label>
          <Link href="/auth/forgot-password" className="font-semibold text-ui-primary hover:text-ui-primary-hover focus-visible:outline-2 focus-visible:outline-ui-primary">Mot de passe oublié ?</Link>
        </div>

        <AuthSubmitButton loading={isLoading}>{isLoading ? "Connexion..." : "Se connecter"}</AuthSubmitButton>
        {error && <AuthFeedback kind="error">{error}</AuthFeedback>}
      </form>
      <AuthFooter prompt="Pas encore de compte ?" href="/auth/register" linkLabel="Créer un compte" />
    </>
  );
}
