"use client";

import { ApiError, apiClient } from "@/lib/api";
import { register } from "@/lib/auth/auth";
import { subscriptionPlanLabel } from "@/lib/subscription/plan-labels";
import { LockKeyhole, Mail, ShieldCheck, UserRound } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import React from "react";
import { AuthDivider, AuthFeedback, AuthFooter, AuthGoogleButton, AuthInput, AuthSubmitButton } from "../AuthFormUI";

type InvitationOffer = {
  email: string;
  subscriptionPlan: "FREE" | "STARTER_MONTHLY" | "STARTER_YEARLY" | "PRO_MONTHLY" | "PRO_YEARLY";
  discountPercent: number;
};

function getErrorMessage(error: ApiError): string {
  return Array.isArray(error.message) ? error.message.join(" ") : error.message;
}

function InvitationNotice({ invitation }: { invitation: InvitationOffer }) {
  return (
    <div className="mb-5 rounded-ui-control border border-ui-primary/20 bg-ui-primary-soft p-4 text-sm text-ui-text">
      Votre invitation pour l’offre {subscriptionPlanLabel(invitation.subscriptionPlan)}
      {invitation.subscriptionPlan === "FREE" ? (
        <> ne nécessite aucun paiement.</>
      ) : (
        <> inclut une remise de {invitation.discountPercent} % sur chaque facture. Après l’activation de votre compte, vous pourrez finaliser l’abonnement dans « Mon abonnement ».</>
      )}
    </div>
  );
}

function RegistrationTerms() {
  return (
    <label className="flex cursor-pointer items-start gap-2.5 text-xs leading-5 text-ui-secondary">
      <input type="checkbox" required className="mt-0.5 h-4 w-4 shrink-0 rounded border-ui-border accent-ui-primary" />
      <span>
        J’accepte les{" "}
        <Link href="/legal#CGU" className="font-medium text-ui-primary underline hover:text-ui-primary-hover">conditions d’utilisation</Link>{" "}
        et la{" "}
        <Link href="/legal#politique-de-confidentialite" className="font-medium text-ui-primary underline hover:text-ui-primary-hover">politique de confidentialité</Link>{" "}
        d’Onetto.
      </span>
    </label>
  );
}

export default function RegisterForm() {
  const router = useRouter();
  const invitationToken = useSearchParams().get("invitation");
  const [invitation, setInvitation] = React.useState<InvitationOffer | null>(null);
  const [invitationError, setInvitationError] = React.useState("");
  const [isInvitationLoading, setIsInvitationLoading] = React.useState(Boolean(invitationToken));
  const [email, setEmail] = React.useState("");
  const [error, setError] = React.useState("");
  const [success, setSuccess] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);

  React.useEffect(() => {
    if (!invitationToken) return;
    let active = true;
    void apiClient<InvitationOffer>(
      `api/users/invitation?token=${encodeURIComponent(invitationToken)}`,
    ).then((result) => {
      if (!active) return;
      if (result.ok) {
        setInvitation(result.data);
        setEmail(result.data.email);
      } else {
        setInvitationError(getErrorMessage(result.error));
      }
      setIsInvitationLoading(false);
    });
    return () => { active = false; };
  }, [invitationToken]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setIsLoading(true);

    const formData = new FormData(event.currentTarget);
    const registrationData = {
      firstname: String(formData.get("firstname") || ""),
      lastname: String(formData.get("lastname") || ""),
      email: String(formData.get("email") || ""),
      password: String(formData.get("password") || ""),
      confirmationPassword: String(formData.get("confirmationPassword") || ""),
      ...(invitationToken ? { invitationToken } : {}),
    };
    const result = await register(registrationData);

    if (!result.ok) {
      setError(getErrorMessage(result.error));
      setIsLoading(false);
      return;
    }

    setIsLoading(false);
    setSuccess("Votre compte a été créé. Vérifiez votre boîte e-mail pour l’activer.");
    setTimeout(() => router.push(`/auth/check-email?email=${encodeURIComponent(registrationData.email)}`), 900);
  }

  return (
    <>
      {invitation && <InvitationNotice invitation={invitation} />}
      {invitationError && <div className="mb-5"><AuthFeedback kind="error">{invitationError}</AuthFeedback></div>}
      <form className="space-y-5" onSubmit={handleSubmit}>
        <AuthGoogleButton label="S’inscrire avec Google" />
        <AuthDivider />

        <div className="grid gap-4 sm:grid-cols-2">
          <AuthInput id="firstname" name="firstname" label="Prénom" icon={UserRound} type="text" required autoComplete="given-name" placeholder="Jean" />
          <AuthInput id="lastname" name="lastname" label="Nom" icon={UserRound} type="text" required autoComplete="family-name" placeholder="Dupont" />
        </div>
        <AuthInput id="email" name="email" label="Email" icon={Mail} type="email" required autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} readOnly={Boolean(invitation)} placeholder="votre@email.com" />
        <div className="grid gap-4 sm:grid-cols-2">
          <AuthInput id="password" name="password" label="Mot de passe" icon={LockKeyhole} type="password" required autoComplete="new-password" placeholder="Minimum 8 caractères" />
          <AuthInput id="confirmationPassword" name="confirmationPassword" label="Confirmation" icon={ShieldCheck} type="password" required autoComplete="new-password" placeholder="Confirmer" />
        </div>
        <RegistrationTerms />
        <AuthSubmitButton loading={isLoading} disabled={isInvitationLoading || Boolean(invitationError)}>{isLoading ? "Création..." : "Créer mon compte"}</AuthSubmitButton>
        {error && <AuthFeedback kind="error">{error}</AuthFeedback>}
        {success && <AuthFeedback kind="success">{success}</AuthFeedback>}
      </form>
      <AuthFooter prompt="Déjà un compte ?" href="/auth/login" linkLabel="Se connecter" />
    </>
  );
}
