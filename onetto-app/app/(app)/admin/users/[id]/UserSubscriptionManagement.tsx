"use client";

import { FormEvent, useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/api";
import { subscriptionPlanLabel } from "@/lib/subscription/plan-labels";

const plans = [
  "FREE",
  "STARTER_MONTHLY",
  "STARTER_YEARLY",
  "PRO_MONTHLY",
  "PRO_YEARLY",
] as const;

type Plan = (typeof plans)[number];

type Subscription = {
  subscriptionPlan: string;
  isActive: boolean;
  subscriptionId: string | null;
  pendingSubscriptionPlan: string | null;
  pendingPlanEffectiveAt: string | null;
} | null;

type ChangeResult = {
  unchanged?: boolean;
  applied?: boolean;
  scheduled?: boolean;
  pendingPayment?: boolean;
  emailSent?: boolean;
  message?: string;
  checkoutCreated?: boolean;
  effectiveAt?: string;
};

type ModalState =
  | { kind: "change-confirmation"; description: string }
  | { kind: "cancel-confirmation" }
  | {
      kind: "result";
      title: string;
      message: string;
      tone: "success" | "warning" | "error";
    };

export default function UserSubscriptionManagement({
  userId,
  accountType,
  subscription,
}: {
  userId: string;
  accountType: string;
  subscription: Subscription;
}) {
  const router = useRouter();
  const currentPlan = subscription?.isActive
    ? subscription.subscriptionPlan
    : "FREE";
  const [selectedPlan, setSelectedPlan] = useState<Plan>(currentPlan as Plan);
  const [isSaving, setIsSaving] = useState(false);
  const [isCanceling, setIsCanceling] = useState(false);
  const [modal, setModal] = useState<ModalState | null>(null);
  const hasPendingChange = Boolean(subscription?.pendingSubscriptionPlan);
  let subscriptionStatus = "inactive";
  if (currentPlan === "FREE") {
    subscriptionStatus = "sans facturation active";
  } else if (subscription?.isActive) {
    subscriptionStatus = "active";
  }

  function changePlan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    let description: string;
    if (selectedPlan === "FREE" && !subscription?.subscriptionId) {
      description = "L’offre gratuite sera appliquée immédiatement.";
    } else if (subscription?.subscriptionId && subscription.isActive) {
      description =
        "Ce changement peut modifier la facturation Stripe ou être programmé à la fin de la période en cours.";
    } else {
      description =
        "Un lien de paiement sera envoyé uniquement à l’utilisateur. Son offre payante ne sera activée qu’après paiement.";
    }
    setModal({ kind: "change-confirmation", description });
  }

  async function confirmPlanChange() {
    setIsSaving(true);
    const result = await apiClient<ChangeResult>(
      `api/admin/users/${userId}/subscription`,
      {
        method: "PATCH",
        body: JSON.stringify({ subscriptionPlan: selectedPlan }),
      },
    );
    setIsSaving(false);

    if (!result.ok) {
      setModal({
        kind: "result",
        title: "Modification impossible",
        message: Array.isArray(result.error.message)
          ? result.error.message.join(" ")
          : result.error.message,
        tone: "error",
      });
      return;
    }

    let title: string;
    let message: string;
    if (result.data.checkoutCreated) {
      title = "Lien de paiement préparé";
      message =
        "Le lien de paiement a été créé pour l’utilisateur concerné. Lui seul doit finaliser le paiement ; l’offre payante sera activée après sa confirmation.";
      if (result.data.emailSent) {
        message += " Le lien lui a été envoyé par e-mail.";
      }
    } else if (result.data.scheduled) {
      title = "Changement d’offre programmé";
      const effectiveDate = result.data.effectiveAt
        ? new Date(result.data.effectiveAt).toLocaleDateString("fr-FR")
        : "la fin de la période en cours";
      message = `La nouvelle offre prendra effet le ${effectiveDate}.`;
      if (result.data.emailSent) {
        message += " L’utilisateur en a été informé par e-mail.";
      }
    } else if (result.data.unchanged) {
      title = "Offre inchangée";
      message = "L’utilisateur dispose déjà de cette offre.";
    } else if (result.data.applied) {
      title = "Offre gratuite appliquée";
      message = "La nouvelle offre est active.";
      if (result.data.emailSent) {
        message += " L’utilisateur en a été informé par e-mail.";
      }
    } else {
      title = "Changement transmis à Stripe";
      message =
        result.data.message ??
        "Le paiement est en cours de confirmation. L’utilisateur recevra un e-mail avec sa facture après confirmation par Stripe.";
    }

    if (result.data.emailSent === false) {
      message +=
        " Attention : l’e-mail n’a pas pu être envoyé. Vérifiez son envoi avant de relancer cette opération.";
    }
    setModal({
      kind: "result",
      title,
      message,
      tone: result.data.emailSent === false ? "warning" : "success",
    });
    router.refresh();
  }

  async function confirmCancelPendingChange() {
    setIsCanceling(true);
    const result = await apiClient(
      `api/admin/users/${userId}/subscription/pending`,
      { method: "DELETE" },
    );
    setIsCanceling(false);
    if (!result.ok) {
      setModal({
        kind: "result",
        title: "Annulation impossible",
        message: Array.isArray(result.error.message)
          ? result.error.message.join(" ")
          : result.error.message,
        tone: "error",
      });
      return;
    }
    setModal({
      kind: "result",
      title: "Changement annulé",
      message: "Le changement d’offre programmé a été annulé dans Stripe.",
      tone: "success",
    });
    router.refresh();
  }

  return (
    <>
      <section className="rounded-2xl border border-zinc-200 bg-white p-5">
        <h3 className="font-semibold">Abonnement</h3>
        {accountType !== "BUSINESS_OWNER" ? (
          <p className="mt-2 text-sm text-zinc-600">
            Les collaborateurs utilisent l’offre du propriétaire de leur
            entreprise.
          </p>
        ) : (
          <>
            <p className="mt-2 text-sm text-zinc-600">
              Offre actuelle : {subscriptionPlanLabel(currentPlan)} ·{" "}
              {subscriptionStatus}
            </p>
            {subscription?.pendingSubscriptionPlan && (
              <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                <p>
                  Changement programmé vers{" "}
                  {subscriptionPlanLabel(subscription.pendingSubscriptionPlan)}
                  {subscription.pendingPlanEffectiveAt && (
                    <>
                      {" "}
                      le{" "}
                      {new Date(
                        subscription.pendingPlanEffectiveAt,
                      ).toLocaleDateString("fr-FR")}
                    </>
                  )}
                  .
                </p>
                <button
                  type="button"
                  disabled={isCanceling}
                  onClick={() => setModal({ kind: "cancel-confirmation" })}
                  className="mt-2 font-semibold underline disabled:opacity-50"
                >
                  {isCanceling ? "Annulation…" : "Annuler ce changement"}
                </button>
              </div>
            )}
            <form
              onSubmit={changePlan}
              className="mt-5 flex flex-wrap items-end gap-3"
            >
              <label className="min-w-56 flex-1 text-sm font-medium text-zinc-800">
                Nouvelle offre
                <select
                  value={selectedPlan}
                  onChange={(event) =>
                    setSelectedPlan(event.target.value as Plan)
                  }
                  disabled={hasPendingChange}
                  className="mt-2 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 outline-none focus:border-primary"
                >
                  {plans.map((plan) => (
                    <option key={plan} value={plan}>
                      {subscriptionPlanLabel(plan)}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="submit"
                disabled={
                  isSaving || hasPendingChange || selectedPlan === currentPlan
                }
                className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
              >
                {isSaving ? "Modification…" : "Modifier l’offre"}
              </button>
            </form>
            <p className="mt-3 text-xs text-zinc-500">
              Les offres payantes sont confirmées par Stripe. Sans abonnement
              Stripe actif, un lien de paiement est envoyé à l’utilisateur et
              doit être finalisé avant activation.
            </p>
          </>
        )}
      </section>
      {modal?.kind === "change-confirmation" && (
        <SubscriptionModal
          title="Confirmer le changement d’offre"
          message={`Passer à l’offre ${subscriptionPlanLabel(selectedPlan)} ? ${modal.description}`}
          confirmLabel="Confirmer le changement"
          busy={isSaving}
          onConfirm={confirmPlanChange}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.kind === "cancel-confirmation" && (
        <SubscriptionModal
          title="Annuler le changement programmé ?"
          message="Le changement d’offre prévu dans Stripe sera annulé. L’offre actuelle restera en place."
          confirmLabel="Annuler le changement"
          busy={isCanceling}
          onConfirm={confirmCancelPendingChange}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.kind === "result" && (
        <SubscriptionModal
          title={modal.title}
          message={modal.message}
          tone={modal.tone}
          onClose={() => setModal(null)}
        />
      )}
    </>
  );
}

type SubscriptionModalProps = {
  title: string;
  message: string;
  tone?: "neutral" | "success" | "warning" | "error";
  confirmLabel?: string;
  busy?: boolean;
  onConfirm?: () => void;
  onClose: () => void;
};

function SubscriptionModal({
  title,
  message,
  tone = "neutral",
  confirmLabel,
  busy = false,
  onConfirm,
  onClose,
}: SubscriptionModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);

  const toneClass = {
    neutral: "bg-zinc-50 text-zinc-700",
    success: "bg-emerald-50 text-emerald-800",
    warning: "bg-amber-50 text-amber-900",
    error: "bg-red-50 text-red-800",
  }[tone];

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) {
          onClose();
        }
      }}
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl border border-zinc-200 bg-white p-6 text-zinc-900 shadow-xl backdrop:bg-zinc-950/40"
    >
      <h3 id={titleId} className="font-title text-lg font-semibold">
        {title}
      </h3>
      <p className={`mt-4 rounded-xl p-4 text-sm leading-6 ${toneClass}`}>
        {message}
      </p>
      <div className="mt-6 flex flex-wrap justify-end gap-3">
        {onConfirm && (
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
          >
            Retour
          </button>
        )}
        <button
          type="button"
          disabled={busy}
          onClick={onConfirm ?? onClose}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-50"
        >
          {busy ? "Traitement…" : (confirmLabel ?? "Fermer")}
        </button>
      </div>
    </dialog>
  );
}
