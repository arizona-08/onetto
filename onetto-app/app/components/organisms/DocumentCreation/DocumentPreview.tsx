"use client";

import { Client, DepositPlanInput, DocumentDates, ServiceLineItem } from "@/app/types";
import { formatDate } from "@/shared/utils";
import { Landmark } from "lucide-react";
import React from "react";
import { useAuthUser } from "../../context/AuthUserContext";
import { useActiveCompany } from "../../context/ActiveCompanyContext";

interface DocumentPreviewProps {
  type: "estimate" | "invoice";
  client: Client | null;
  lineItems: ServiceLineItem[];
  documentDates: DocumentDates;
  creationDate: string;
  documentNumber?: string;
  paymentMode?: "ONE_TIME" | "INSTALMENTS";
  numberOfInstalments?: 2 | 3;
  depositPlan?: DepositPlanInput | null;
  editorLayout?: boolean;
}

const currency = (amount: number) =>
  amount.toLocaleString("fr-FR", { style: "currency", currency: "EUR" });

function DocumentPreview({
  type,
  client,
  lineItems,
  documentDates,
  creationDate,
  documentNumber,
  paymentMode = "ONE_TIME",
  numberOfInstalments = 2,
  depositPlan,
  editorLayout = false,
}: DocumentPreviewProps) {
  const { user } = useAuthUser();
  const { activeCompany } = useActiveCompany();
  const contactEmail = user?.email ?? "";
  const totalHT = lineItems.reduce(
    (sum, item) => sum + item.unitPrice * item.quantity,
    0,
  );
  const totalTVA = lineItems.reduce(
    (sum, item) => sum + (item.unitPrice * item.quantity * item.taxRate) / 100,
    0,
  );
  const totalTTC = totalHT + totalTVA;

  return (
    <div className={editorLayout ? "min-w-0 rounded-ui-card border border-ui-border bg-ui-primary-soft/20 p-4 shadow-ui-card xl:sticky xl:top-5" : "mt-10"}>
      <div className={editorLayout ? "mb-4 flex items-center justify-between border-b border-ui-border pb-3 text-sm font-semibold text-ui-primary" : "mb-4 flex w-fit items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm text-primary"}>
        {!editorLayout && <span className="h-2 w-2 animate-pulse rounded-full bg-primary" />}
        <span>Aperçu {type === "invoice" ? "de la facture" : "du devis"}</span>
      </div>

      <article className={editorLayout ? "mx-auto w-full max-w-2xl overflow-hidden rounded-ui-control border border-ui-border bg-ui-surface text-[11px] leading-relaxed text-ui-text shadow-ui-card" : "mx-auto w-full max-w-2xl overflow-hidden rounded-md bg-white text-xs leading-relaxed text-zinc-950"}>
        <header className={editorLayout ? "px-4 py-5 sm:px-6" : "px-7 py-6"}>
          <div className="flex items-start justify-between gap-6">
            <div>
              <p className={editorLayout ? "font-title text-3xl font-semibold text-ui-text" : "flex flex-col font-title text-7xl font-medium uppercase tracking-tighter text-primary"}>
                {type === "invoice" ? "Facture" : "Devis"}
              </p>
              <span className="text-xs text-ui-secondary">{documentNumber ?? "Numéro attribué à l’enregistrement"}</span>

              <div className="mt-5 flex flex-col gap-2">
                <div>
                  <p className="font-semibold text-zinc-500">
                    {type === "invoice" ? "Date d'emission" : "Date du devis"}
                  </p>
                  <p>{formatDate(creationDate)}</p>
                </div>

                <div>
                  <p className="font-semibold text-zinc-500">Date d’échéance</p>
                  <p>{formatDate(documentDates.dueDate)}</p>
                </div>
              </div>
            </div>

            {/* Logo de l'entreprise */}
            <div className={editorLayout ? "flex h-12 w-12 shrink-0 items-center justify-center rounded-ui-control bg-ui-primary-soft font-title text-xl font-bold text-ui-primary" : "h-20 w-20 rounded-md bg-primary"}>{editorLayout ? "O" : null}</div>
          </div>

          {/* divider */}
          <hr className="inline-block w-full mt-10 text-primary" />

          <div className={`mt-7 grid gap-6 ${editorLayout ? "sm:grid-cols-2" : "md:grid-cols-2"}`}>
            <section className="">
              <div className="space-y-0.5">
                <p className="min-h-5 font-title text-lg font-semibold">
                  {activeCompany?.name ?? ""}
                </p>
                <p>SIREN : {activeCompany?.siren ?? ""}</p>
                <p>TVA intracommunautaire : {activeCompany?.vatNumber ?? ""}</p>
                <p>Téléphone: {activeCompany?.phoneNumber}</p>
                <p>Email: {contactEmail}</p>
                <p className="min-h-4">{activeCompany?.address}</p>
                <p className="min-h-4">
                  {activeCompany?.postalCode}, {activeCompany?.city}
                </p>
              </div>
            </section>

            <section className="text-right">
              <p className="mb-2 font-semibold uppercase text-zinc-500">
                À l’attention de
              </p>
              <div className="space-y-0.5">
                <p className="min-h-5 font-title text-lg font-semibold">
                  {client?.name ?? ""}
                </p>
                <p>{client?.email ?? ""}</p>
                {client?.clientType === "BUSINESS" && client.siren && (
                  <p>SIREN : {client.siren}</p>
                )}
                {client?.clientType === "BUSINESS" && client.vatNumber && (
                  <p>TVA intracommunautaire : {client.vatNumber}</p>
                )}
                <p>{client?.address ?? ""}</p>
                <p>
                  {[client?.postalCode, client?.city, client?.country].filter(Boolean).join(", ")}
                </p>
              </div>
            </section>
          </div>
        </header>

        <div className={editorLayout ? "px-4 py-5 sm:px-6" : "px-7 py-6"}>
          <div className="overflow-x-auto">
            <table className={`w-full table-fixed border-collapse text-left text-[10px] ${editorLayout ? "min-w-[480px]" : ""}`}>
              <colgroup>
                <col className="w-[37%]" />
                <col className="w-[7%]" />
                <col className="w-[13%]" />
                <col className="w-[12%]" />
                <col className="w-[7%]" />
                <col className="w-[12%]" />
                <col className="w-[12%]" />
              </colgroup>
              <thead className="whitespace-nowrap bg-primary/10">
                <tr className="border-b border-zinc-200 font-semibold uppercase text-zinc-600">
                  <th className="py-2.5 pl-1 pr-1.5">Description</th>
                  <th className="px-1.5 py-2.5">Qté</th>
                  <th className="px-1.5 py-2.5">Prix HT</th>
                  <th className="px-1.5 py-2.5">Unité</th>
                  <th className="px-1.5 py-2.5">TVA</th>
                  <th className="px-1.5 py-2.5 text-right">Total HT</th>
                  <th className="py-2.5 pl-1.5 pr-1 text-right">Total TTC</th>
                </tr>
              </thead>
              <tbody>
                {lineItems.length > 0 ? (
                  lineItems.map((item, index) => {
                    const ht = item.quantity * item.unitPrice;
                    const ttc = ht * (1 + item.taxRate / 100);
                    return (
                      <tr
                        key={index}
                        className="border-b border-zinc-100 last:border-b-zinc-200"
                      >
                        <td className="py-3 pl-1 pr-1.5 font-medium">
                          {item.description}
                        </td>
                        <td className="px-1.5 py-3">{item.quantity}</td>
                        <td className="whitespace-nowrap px-1.5 py-3">
                          {currency(item.unitPrice)}
                        </td>
                        <td className="px-1.5 py-3">{item.unit}</td>
                        <td className="px-1.5 py-3">{item.taxRate} %</td>
                        <td className="whitespace-nowrap px-1.5 py-3 text-right font-semibold">
                          {currency(ht)}
                        </td>
                        <td className="whitespace-nowrap py-3 pl-1.5 pr-1 text-right font-semibold">
                          {currency(ttc)}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr className="h-11 border-b border-zinc-200">
                    <td colSpan={7} />
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-6 flex justify-end">
            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-12 text-zinc-500">
                <p>Sous total: </p>
                <p>{currency(totalHT)}</p>
              </div>

              <div className="flex items-center gap-12 text-zinc-500">
                <p>Total TVA: </p>
                <p>{currency(totalTVA)}</p>
              </div>

              <div className="flex items-center gap-12 font-semibold text-primary">
                <p>TOTAL TTC: </p>
                <p>{currency(totalTTC)}</p>
              </div>
            </div>
          </div>

          {editorLayout && (
            <section className="mt-6 rounded-ui-control bg-ui-primary-soft/50 p-3 text-xs">
              <h2 className="font-semibold text-ui-text">Conditions de paiement</h2>
              <p className="mt-1 text-ui-secondary">
                {type === "estimate" && depositPlan
                  ? `${depositPlan.deposits.length} acompte(s) et un solde`
                  : paymentMode === "INSTALMENTS"
                    ? `Paiement en ${numberOfInstalments} échéances`
                    : "Paiement unique"}
                {documentDates.dueDate ? ` · Échéance le ${formatDate(documentDates.dueDate)}` : ""}
              </p>
            </section>
          )}

          <footer className="mt-7 grid gap-6 border-t border-zinc-200 pt-5 md:grid-cols-[1.1fr,0.9fr]">
            <section>
              <div className="mb-3 flex items-center gap-2 font-title font-semibold">
                <Landmark className="h-4 w-4 text-primary" />
                <h2>Coordonnées bancaires</h2>
              </div>
              <div className="grid gap-x-8 gap-y-2 sm:grid-cols-2">
                <p className="flex justify-between gap-4">
                  <b>Titulaire: {activeCompany?.name ?? ""} </b>
                  <span />
                </p>
                <p className="flex justify-between gap-4">
                  <b>IBAN: {activeCompany?.IBAN ?? ""} </b>
                  <span />
                </p>
                {activeCompany?.bank && (
                  <p className="flex justify-between gap-4">
                    <b>Banque: {activeCompany.bank} </b>
                    <span />
                  </p>
                )}
                <p className="flex justify-between gap-4">
                  <b>BIC: {activeCompany?.BIC ?? ""} </b>
                  <span />
                </p>
              </div>
            </section>
            <section className="flex flex-col justify-between gap-6">
              <hr className="inline-block w-full text-primary" />
              <div className="text-right">
                <p className="text-[10px] text-zinc-500">
                  Merci pour votre confiance.
                </p>
                <p>{type === "invoice" ? "Facture" : "Devis"} fait avec Onetto</p>
              </div>
            </section>
          </footer>
        </div>
      </article>
    </div>
  );
}

export default DocumentPreview;
