"use client";

import { ChevronDown } from "lucide-react";
import { FormEvent, useEffect, useId, useRef, useState } from "react";
import { apiClient } from "@/lib/api";

type Plan =
  | "FREE"
  | "STARTER_MONTHLY"
  | "STARTER_YEARLY"
  | "PRO_MONTHLY"
  | "PRO_YEARLY";
type InvitationResult = { invited: boolean; emailSent: boolean };

type InviteUserDialogProps = {
  onClose: () => void;
};

const discounts = [5, 10, 15, 20, 25, 30, 35, 40] as const;

export default function InviteUserDialog({ onClose }: InviteUserDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [email, setEmail] = useState("");
  const [plan, setPlan] = useState<Plan>("PRO_MONTHLY");
  const [discountPercent, setDiscountPercent] = useState(5);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resultMessage, setResultMessage] = useState("");
  const [resultTone, setResultTone] = useState<"success" | "error">("success");

  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);

  async function submitInvitation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setResultMessage("");
    const response = await apiClient<InvitationResult>(
      "api/admin/users/invitations",
      {
        method: "POST",
        body: JSON.stringify({
          email,
          subscriptionPlan: plan,
          discountPercent: plan === "FREE" ? 0 : discountPercent,
        }),
      },
    );
    setIsSubmitting(false);

    if (!response.ok) {
      setResultTone("error");
      setResultMessage(
        Array.isArray(response.error.message)
          ? response.error.message.join(" ")
          : response.error.message,
      );
      return;
    }
    if (!response.data.emailSent) {
      setResultTone("error");
      setResultMessage(
        "L’invitation a été enregistrée, mais l’e-mail n’a pas pu être envoyé. Vérifiez la messagerie puis renvoyez l’invitation.",
      );
      return;
    }
    setResultTone("success");
    setResultMessage(`Invitation envoyée à ${email.trim().toLowerCase()}.`);
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        if (!isSubmitting) {
          onClose();
        }
      }}
      className="m-auto w-[calc(100%-2rem)] max-w-lg rounded-2xl border border-zinc-200 bg-white p-6 text-zinc-900 shadow-xl backdrop:bg-zinc-950/40"
    >
      <h3 id={titleId} className="font-title text-xl font-semibold">
        Inviter un utilisateur
      </h3>
      <p className="mt-2 text-sm leading-6 text-zinc-600">
        Le destinataire créera son compte. Les offres payantes seront réglées
        par lui-même, avec la remise choisie.
      </p>
      {resultTone === "success" && resultMessage ? (
        <div className="mt-6 space-y-5">
          <p
            role="status"
            className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800"
          >
            {resultMessage}
          </p>
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-hover"
          >
            Fermer
          </button>
        </div>
      ) : (
        <form onSubmit={submitInvitation} className="mt-6 space-y-5">
          <label className="block text-sm font-medium text-zinc-800">
            Adresse e-mail
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              autoFocus
              placeholder="personne@exemple.com"
              className="mt-2 w-full rounded-lg border border-zinc-300 px-3 py-2.5 outline-none focus:border-primary"
            />
          </label>
          <label className="block text-sm font-medium text-zinc-800">
            Abonnement proposé
            <span className="relative mt-2 block">
              <select
                value={plan}
                onChange={(event) => setPlan(event.target.value as Plan)}
                className="w-full appearance-none rounded-lg border border-zinc-300 bg-white px-3 py-2.5 pr-10 outline-none focus:border-primary"
              >
                <option value="FREE">Gratuit</option>
                <option value="STARTER_MONTHLY">Starter — Mensuel</option>
                <option value="STARTER_YEARLY">Starter — Annuel</option>
                <option value="PRO_MONTHLY">Pro — Mensuel</option>
                <option value="PRO_YEARLY">Pro — Annuel</option>
              </select>
              <ChevronDown
                className="pointer-events-none absolute right-3 top-3 h-4 w-4 text-zinc-500"
                aria-hidden="true"
              />
            </span>
          </label>
          {plan !== "FREE" && (
            <label className="block text-sm font-medium text-zinc-800">
              Remise sur chaque facture
              <span className="relative mt-2 block">
                <select
                  value={discountPercent}
                  onChange={(event) =>
                    setDiscountPercent(Number(event.target.value))
                  }
                  className="w-full appearance-none rounded-lg border border-zinc-300 bg-white px-3 py-2.5 pr-10 outline-none focus:border-primary"
                >
                  {discounts.map((discount) => (
                    <option key={discount} value={discount}>
                      -{discount} %
                    </option>
                  ))}
                </select>
                <ChevronDown
                  className="pointer-events-none absolute right-3 top-3 h-4 w-4 text-zinc-500"
                  aria-hidden="true"
                />
              </span>
            </label>
          )}
          {resultMessage && (
            <p
              role="alert"
              className="rounded-lg bg-red-50 p-3 text-sm text-red-700"
            >
              {resultMessage}
            </p>
          )}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={onClose}
              className="rounded-lg border border-zinc-300 px-4 py-2.5 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-50"
            >
              {isSubmitting ? "Envoi…" : "Inviter"}
            </button>
          </div>
        </form>
      )}
    </dialog>
  );
}
