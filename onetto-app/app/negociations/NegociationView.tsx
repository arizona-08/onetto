"use client";

import { DepositPlanInput, PublicNegociation } from "@/app/types";
import DepositPlanEditor from "@/app/components/molecules/DepositPlanEditor";
import { apiClient } from "@/lib/api";
import { formatCurrency, formatDate } from "@/shared/utils";
import {
  CheckCircle2,
  CircleCheck,
  CircleX,
  FileText,
  MessageSquareText,
  Send,
} from "lucide-react";
import { useRef, useState } from "react";
import AcceptEstimateModal from "./AcceptEstimateModal";

type NegociationViewProps = { negociation: PublicNegociation; token: string };
type NegociationStatus = PublicNegociation["status"];

export default function NegociationView({
  negociation,
  token,
}: NegociationViewProps) {
  const [message, setMessage] = useState(negociation.message);
  const [status, setStatus] = useState<NegociationStatus>(negociation.status);
  const [showChanges, setShowChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isOpeningMandate, setIsOpeningMandate] = useState(false);
  const [showAcceptConfirmation, setShowAcceptConfirmation] = useState(false);
  const acceptButton = useRef<HTMLButtonElement>(null);
  const [error, setError] = useState("");
  const [mandateMessage, setMandateMessage] = useState("");
  const { document } = negociation;
  const [isMandateActive, setIsMandateActive] = useState(
    document.contractPaymentPlan?.mandateStatus === "ACTIVE",
  );
  const [isAuthorisationComplete, setIsAuthorisationComplete] = useState(
    negociation.status === "ACCEPTED" && Boolean(document.contractPaymentPlan?.providerMandateId),
  );
  const [acceptanceStarted, setAcceptanceStarted] = useState(
    Boolean(document.contractPaymentPlan?.acceptanceRequestedAt),
  );
  const [proposedPlan, setProposedPlan] = useState<DepositPlanInput | null>(() =>
    document.contractPaymentPlan ? {
      deposits: document.contractPaymentPlan.stages
        .filter((stage) => stage.kind === "DEPOSIT")
        .map(({ percentage, triggerCondition }) => ({ percentage, triggerCondition })),
      balanceCondition: document.contractPaymentPlan.stages.find((stage) => stage.kind === "BALANCE")?.triggerCondition ?? "À la livraison",
    } : null,
  );
  const { company } = document;
  const isInvoice = document.type === "INVOICE";
  const canNegotiate = negociation.canNegotiate;

  function closeAcceptConfirmation() {
    setShowAcceptConfirmation(false);
    acceptButton.current?.focus();
  }

  function confirmAcceptance() {
    setShowAcceptConfirmation(false);
    void setDecision("ACCEPTED");
  }

  async function setDecision(nextStatus: "ACCEPTED" | "REJECTED") {
    if (nextStatus === "ACCEPTED" && document.contractPaymentPlan) {
      await openMandate(true);
      return;
    }
    setIsSaving(true);
    setError("");
    const response = await apiClient<{ success: true }>(
      `api/negociations/${encodeURIComponent(token)}/status`,
      {
        method: "PUT",
        body: JSON.stringify({ status: nextStatus }),
      },
    );
    setIsSaving(false);
    if (!response.ok) {
      setError(
        "Votre réponse n’a pas pu être enregistrée. Veuillez réessayer.",
      );
      return;
    }
    setStatus(nextStatus);
  }

  async function submitChanges(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setError("");
    const originalStages = document.contractPaymentPlan?.stages ?? [];
    const originalDeposits = originalStages.filter((stage) => stage.kind === "DEPOSIT");
    const planChanged = proposedPlan && (
      proposedPlan.deposits.length !== originalDeposits.length ||
      proposedPlan.deposits.some((deposit, index) =>
        deposit.percentage !== originalDeposits[index]?.percentage ||
        deposit.triggerCondition.trim() !== originalDeposits[index]?.triggerCondition.trim(),
      ) ||
      proposedPlan.balanceCondition.trim() !== originalStages.find((stage) => stage.kind === "BALANCE")?.triggerCondition.trim()
    );
    const response = await apiClient<{ success: true }>(
      `api/negociations/${encodeURIComponent(token)}/message`,
      {
        method: "PUT",
        body: JSON.stringify({
          message: message.trim(),
          ...(planChanged ? {
            proposedDeposits: proposedPlan.deposits,
            proposedBalanceCondition: proposedPlan.balanceCondition,
          } : {}),
        }),
      },
    );
    setIsSaving(false);
    if (!response.ok) {
      setError(
        "Votre demande n’a pas pu être enregistrée. Veuillez réessayer.",
      );
      return;
    }
    setStatus("RENEGOCIATED");
  }

  async function openMandate(accepting = false) {
    const authorizationToken = document.contractPaymentPlan?.authorizationToken;
    if (!authorizationToken) return;
    setIsOpeningMandate(true);
    setError("");
    setMandateMessage("");
    const response = await apiClient<{ url: string | null; message?: string; accepted?: boolean }>(
      accepting
        ? `api/negociations/${encodeURIComponent(token)}/accept-with-mandate`
        : `api/public/contracts/${encodeURIComponent(authorizationToken)}/mandate`,
      accepting ? { method: "POST" } : undefined,
    );
    setIsOpeningMandate(false);
    if (!response.ok) {
      setError("Le parcours d’autorisation est indisponible. Veuillez réessayer.");
      return;
    }
    if (accepting) setAcceptanceStarted(true);
    if (response.data.accepted) {
      setStatus("ACCEPTED");
      setIsAuthorisationComplete(true);
    }
    if (response.data.url) window.location.assign(response.data.url);
    else if (response.data.message === "Le mandat est autorisé.") {
      setIsMandateActive(true);
      if (response.data.accepted || status === "ACCEPTED") setIsAuthorisationComplete(true);
      setMandateMessage(response.data.message);
    } else if (response.data.message === "Le mandat est en cours d’activation.") {
      setMandateMessage(response.data.message);
    } else {
      setError(response.data.message ?? "Le mandat ne peut plus être autorisé.");
    }
  }

  return (
    <main className="min-h-screen bg-ui-background px-4 py-6 text-ui-text sm:px-6 lg:py-10">
      <div className="mx-auto max-w-6xl">
        <header className="mb-6 flex flex-col gap-5 rounded-ui-card border border-ui-border bg-ui-surface px-5 py-4 shadow-ui-card sm:flex-row sm:items-center sm:justify-between sm:px-7">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-ui-control bg-ui-primary text-white">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <p className="font-title text-lg font-bold tracking-tight">
                Onetto
              </p>
              <p className="text-sm text-ui-secondary">
                {isInvoice
                  ? "Votre facture finale"
                  : "Votre devis et son espace d’échange"}
              </p>
            </div>
          </div>
          <span className="w-fit rounded-full bg-ui-primary-soft px-3 py-1.5 text-xs font-semibold text-ui-primary">
            {isInvoice ? "Facture" : "Devis"} {document.documentNumber}
          </span>
        </header>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
          <article className="min-w-0 overflow-hidden rounded-ui-card border border-ui-border bg-ui-surface shadow-ui-card">
            <div className="border-b border-ui-border px-6 py-7 sm:px-9">
              <div className="flex items-start justify-between gap-6">
                <div>
                  <p className="font-title text-4xl font-semibold tracking-tight text-ui-text sm:text-5xl">
                    {isInvoice ? "Facture" : "Devis"}
                  </p>
                  <p className="mt-2 text-sm font-medium text-ui-secondary">
                    n° {document.documentNumber}
                  </p>
                </div>
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-ui-control bg-ui-primary-soft text-ui-primary">
                  <FileText className="h-6 w-6" aria-hidden="true" />
                </div>
              </div>
              <div className="mt-7 grid gap-3 text-sm text-ui-secondary sm:grid-cols-2">
                <p>
                  <span className="font-semibold text-ui-text">Émis le </span>
                  {formatDate(
                    isInvoice
                      ? (document.sentAt ?? document.createdAt)
                      : document.createdAt,
                  )}
                </p>
                <p>
                  <span className="font-semibold text-ui-text">
                    {isInvoice ? "Date d’échéance " : "Valable jusqu’au "}
                  </span>
                  {formatDate(document.paymentDueAt)}
                </p>
              </div>
            </div>
            <div className="px-6 py-7 sm:px-9">
              <div className="grid gap-8 border-b border-ui-border pb-7 text-sm sm:grid-cols-2">
                <section>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-ui-secondary">
                    Proposé par
                  </p>
                  <p className="font-title text-lg font-semibold">
                    {company.name}
                  </p>
                  <p>{company.address}</p>
                  <p>
                    {company.postalCode} {company.city}, {company.country}
                  </p>
                  <p className="mt-2 text-ui-secondary">SIREN : {company.siren}</p>
                  {company.subjectToVat && company.vatNumber && (
                    <p className="text-ui-secondary">TVA : {company.vatNumber}</p>
                  )}
                  <p className="break-words text-ui-secondary">
                    {company.email} · {company.phoneNumber}
                  </p>
                </section>
                <section className="sm:text-right">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-ui-secondary">
                    À l’attention de
                  </p>
                  <p className="font-title text-lg font-semibold">
                    {document.clientName}
                  </p>
                  <p className="break-words">{document.clientEmail}</p>
                  <p className="mt-2">{document.clientAddress}</p>
                  <p>
                    {document.clientPostalCode} {document.clientCity},{" "}
                    {document.clientCountry}
                  </p>
                </section>
              </div>
              <div className="mt-7 overflow-x-auto">
                <table className="w-full min-w-[590px] text-left text-sm">
                  <thead className="bg-ui-subtle text-xs uppercase tracking-wide text-ui-secondary">
                    <tr>
                      <th className="rounded-l-lg px-3 py-3">Description</th>
                      <th className="px-3 py-3">Qté</th>
                      <th className="px-3 py-3">Prix HT</th>
                      <th className="px-3 py-3">TVA</th>
                      <th className="rounded-r-lg px-3 py-3 text-right">
                        Total TTC
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {document.services.map((service) => (
                      <tr key={service.id} className="border-b border-ui-border">
                        <td className="px-3 py-4 font-medium">
                          {service.description}
                        </td>
                        <td className="px-3 py-4">
                          {service.quantity} {service.unit}
                        </td>
                        <td className="px-3 py-4">
                          {formatCurrency(service.unitPrice)}
                        </td>
                        <td className="px-3 py-4">{service.taxRate ?? 0} %</td>
                        <td className="px-3 py-4 text-right font-semibold">
                          {formatCurrency(service.totalPrice)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="ml-auto mt-7 w-full max-w-xs space-y-2 rounded-ui-control bg-ui-subtle p-4 text-sm">
                <div className="flex justify-between text-ui-secondary">
                  <span>Sous-total</span>
                  <span>{formatCurrency(document.totalPriceExcludingTax)}</span>
                </div>
                <div className="flex justify-between text-ui-secondary">
                  <span>TVA</span>
                  <span>
                    {formatCurrency(
                      document.totalPrice - document.totalPriceExcludingTax,
                    )}
                  </span>
                </div>
                <div className="flex justify-between border-t border-ui-border pt-3 font-semibold text-ui-primary">
                  <span>Total TTC</span>
                  <span>{formatCurrency(document.totalPrice)}</span>
                </div>
              </div>
              {document.invoicePaymentMode?.paymentMode === "INSTALMENTS" && (
                <section className="mt-7 rounded-ui-control border border-ui-border bg-ui-primary-soft/40 p-5">
                  <h2 className="text-lg font-semibold text-ui-text">Paiement en plusieurs fois</h2>
                  <p className="mt-2 text-sm leading-6 text-ui-secondary">
                    Le montant du devis sera réglé en {document.invoicePaymentMode.numberOfInstalments} échéances hebdomadaires
                    {document.invoicePaymentMode.firstDueDate
                      ? `, à partir du ${formatDate(document.invoicePaymentMode.firstDueDate)}`
                      : ""}.
                    Le paiement sera organisé après l’émission de la facture.
                  </p>
                </section>
              )}
            </div>
          </article>
          {!isInvoice && (
            <aside className="space-y-5 lg:sticky lg:top-8">
              <section className="rounded-ui-card border border-ui-border bg-ui-surface p-5 shadow-ui-card">
                <div className="flex h-10 w-10 items-center justify-center rounded-ui-control bg-ui-primary-soft text-ui-primary">
                  <MessageSquareText className="h-5 w-5" />
                </div>
                {status === "PENDING" && !showChanges && (
                  <>
                    <h1 className="mt-4 font-title text-xl font-semibold">
                      Votre décision
                    </h1>
                    <p className="mt-2 text-sm leading-6 text-ui-secondary">
                      {acceptanceStarted
                        ? "L’acceptation sera enregistrée lorsque le parcours d’autorisation SEPA sera terminé."
                        : canNegotiate
                        ? "Vous pouvez accepter ce devis, demander des ajustements ou le refuser."
                        : "Vous pouvez accepter ou refuser ce devis."}
                    </p>
                    <div className="mt-5 space-y-2">
                      <button
                        ref={acceptButton}
                        type="button"
                        onClick={() => {
                          if (document.contractPaymentPlan && !acceptanceStarted) {
                            setShowAcceptConfirmation(true);
                          } else {
                            void setDecision("ACCEPTED");
                          }
                        }}
                        disabled={isSaving || isOpeningMandate}
                        className="flex w-full items-center justify-center gap-2 rounded-ui-control bg-ui-primary px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-ui-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ui-primary disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <CircleCheck className="h-4 w-4" />
                        {isOpeningMandate
                          ? "Ouverture de l’autorisation…"
                          : document.contractPaymentPlan && acceptanceStarted
                            ? "Continuer l’autorisation du mandat SEPA"
                            : "Accepter le devis"}
                      </button>
                      {!acceptanceStarted && (canNegotiate ? (
                        <button
                          onClick={() => setShowChanges(true)}
                          disabled={isSaving}
                          className="w-full rounded-ui-control border border-ui-border px-4 py-3 text-sm font-semibold text-ui-primary transition-colors hover:bg-ui-primary-soft focus-visible:outline-2 focus-visible:outline-ui-primary"
                        >
                          Demander des changements
                        </button>
                      ) : (
                        <div
                          title="Passer au plan STARTER pour activer cette fonctionnalité"
                          className="cursor-not-allowed opacity-50"
                        >
                          <button
                            type="button"
                            disabled
                            className="w-full rounded-ui-control border border-ui-border px-4 py-3 text-sm font-semibold text-ui-primary"
                          >
                            Demander des changements
                          </button>
                          <p className="mt-2 rounded-ui-control border border-dashed border-ui-border bg-ui-subtle px-3 py-2 text-xs text-ui-secondary">
                            Passer au plan STARTER pour activer la négociation.
                          </p>
                        </div>
                      ))}
                      {!acceptanceStarted && <button
                        onClick={() => setDecision("REJECTED")}
                        disabled={isSaving}
                        className="flex w-full items-center justify-center gap-2 rounded-ui-control px-4 py-3 text-sm font-semibold text-ui-secondary hover:bg-ui-subtle focus-visible:outline-2 focus-visible:outline-ui-primary"
                      >
                        <CircleX className="h-4 w-4" />
                        Refuser le devis
                      </button>}
                    </div>
                    {error && <p className="mt-3 text-sm text-red-600" role="alert">{error}</p>}
                    {mandateMessage && <p className="mt-3 text-sm text-ui-secondary">{mandateMessage}</p>}
                  </>
                )}
                {status === "PENDING" && showChanges && (
                  <form className="mt-4" onSubmit={submitChanges}>
                    <h1 className="mt-4 font-title text-xl font-semibold">
                      Quels changements ?
                    </h1>
                    <p className="mt-2 text-sm leading-6 text-ui-secondary">
                      Décrivez les ajustements souhaités sur ce devis.
                    </p>
                    <textarea
                      value={message}
                      onChange={(event) => setMessage(event.target.value)}
                      maxLength={5000}
                      rows={9}
                      placeholder="Par exemple : ajouter, modifier ou supprimer une prestation ; ajuster une quantité ; demander une remise sur une ligne ou sur le total du devis ; poser une question…"
                      className="mt-4 w-full resize-y rounded-ui-control border border-ui-border bg-ui-surface px-3 py-3 text-sm leading-6 outline-none transition placeholder:text-ui-secondary/70 focus:border-ui-primary focus:ring-2 focus:ring-ui-primary/15"
                    />
                    {proposedPlan && (
                      <DepositPlanEditor value={proposedPlan} onChange={setProposedPlan} totalAmountInCents={document.contractPaymentPlan?.totalAmountInCents ?? 0} />
                    )}
                    {error && (
                      <p className="mt-2 text-sm text-red-600">{error}</p>
                    )}
                    <button
                      type="submit"
                      disabled={isSaving || !message.trim()}
                      className="mt-3 flex w-full items-center justify-center gap-2 rounded-ui-control bg-ui-primary px-4 py-3 text-sm font-semibold text-white hover:bg-ui-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ui-primary disabled:opacity-50"
                    >
                      <Send className="h-4 w-4" />
                      {isSaving ? "Enregistrement…" : "Valider mes changements"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowChanges(false)}
                      className="mt-3 w-full rounded-ui-control px-4 py-2 text-sm font-medium text-ui-secondary hover:bg-ui-subtle focus-visible:outline-2 focus-visible:outline-ui-primary"
                    >
                      Retour
                    </button>
                  </form>
                )}
                {status === "ACCEPTED" && (
                  <>
                    <DecisionResult
                      icon={<CircleCheck className="h-6 w-6" />}
                      title="Devis accepté"
                      text={document.contractPaymentPlan && !isAuthorisationComplete
                        ? "Votre acceptation est enregistrée. Terminez l’autorisation du mandat SEPA pour permettre les prélèvements."
                        : document.contractPaymentPlan && !isMandateActive
                          ? "Votre devis est accepté et le mandat SEPA est en cours d’activation."
                          : "Votre acceptation a bien été enregistrée."}
                      tone="text-ui-success"
                    />
                    {document.contractPaymentPlan && !document.contractPaymentPlan.cancelledAt && !isAuthorisationComplete && (
                      <button type="button" disabled={isOpeningMandate} onClick={() => void openMandate()}
                        className="mt-4 w-full rounded-ui-control bg-ui-primary px-4 py-3 text-sm font-semibold text-white hover:bg-ui-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ui-primary disabled:opacity-50">
                        {isOpeningMandate ? "Ouverture…" : "Continuer l’autorisation du mandat SEPA"}
                      </button>
                    )}
                    {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
                    {mandateMessage && <p className="mt-2 text-sm text-ui-secondary">{mandateMessage}</p>}
                  </>
                )}
                {status === "RENEGOCIATED" && (
                  <DecisionResult
                    icon={<CheckCircle2 className="h-6 w-6" />}
                    title="Changements demandés"
                    text="Votre demande a bien été transmise avec le devis."
                    tone="text-ui-primary"
                  />
                )}
                {status === "REJECTED" && (
                  <DecisionResult
                    icon={<CircleX className="h-6 w-6" />}
                    title="Devis refusé"
                    text="Votre décision a bien été enregistrée."
                    tone="text-ui-secondary"
                  />
                )}
              </section>
              {document.contractPaymentPlan && (
                <section className="rounded-ui-card border border-ui-border bg-ui-surface p-5 shadow-ui-card" aria-labelledby="deposit-plan-title">
                  <h2 id="deposit-plan-title" className="font-title text-lg font-semibold text-ui-text">Acomptes et solde</h2>
                  <p className="mt-2 text-sm leading-6 text-ui-secondary">
                    Chaque prélèvement sera déclenché séparément après facturation. L’acceptation du devis ne déclenche aucun paiement.
                  </p>
                  <ol className="mt-4 divide-y divide-ui-border">
                    {document.contractPaymentPlan.stages.map((stage) => (
                      <li key={stage.id} className="flex items-start gap-3 py-4">
                        <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-ui-primary bg-ui-surface text-ui-primary" aria-hidden="true">
                          <span className="h-2 w-2 rounded-full bg-current" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-ui-text">
                            {stage.kind === "BALANCE" ? "Solde" : `Acompte ${stage.sequence}`} · {stage.percentage} %
                          </p>
                          <p className="mt-0.5 text-xs leading-5 text-ui-secondary">{stage.triggerCondition}</p>
                        </div>
                        <p className="shrink-0 text-right text-sm font-semibold text-ui-text">
                          {formatCurrency(stage.amountInCents / 100)}
                        </p>
                      </li>
                    ))}
                  </ol>
                </section>
              )}
            </aside>
          )}
        </div>
      </div>
      {showAcceptConfirmation && (
        <AcceptEstimateModal
          onClose={closeAcceptConfirmation}
          onConfirm={confirmAcceptance}
        />
      )}
    </main>
  );
}

function DecisionResult({
  icon,
  title,
  text,
  tone,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
  tone: string;
}) {
  return (
    <div className="mt-4">
      <div
        className={`flex h-10 w-10 items-center justify-center rounded-ui-control bg-ui-subtle ${tone}`}
      >
        {icon}
      </div>
      <h1 className="mt-4 font-title text-xl font-semibold">{title}</h1>
      <p className="mt-2 text-sm leading-6 text-ui-secondary">{text}</p>
    </div>
  );
}
