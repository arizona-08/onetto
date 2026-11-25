"use client";

import { Document, DocumentService } from "@/app/types";
import { formatDate } from "@/shared/utils";
import { Landmark } from "lucide-react";
import React from "react";
import { useActiveCompany } from "../../context/ActiveCompanyContext";
import { useAuthUser } from "../../context/AuthUserContext";
import DocumentVersionSelector from "../DocumentVersionSelector";
import DocumentParty from "../DocumentParty";
import CompanyLogo from "../CompanyLogo";

interface DocumentDisplayComponentProps {
  document: Document;
}

const fallbackCompany = {
  name: "Atelier Onetto Studio",
  address: "14 avenue de la République",
  postalCode: "75011",
  city: "Paris",
  siren: "918 245 637",
  vatNumber: "FR 32 918245637",
  phoneNumber: "",
  iban: "FR76 3000 1007 9412 3456 7890 123",
  bic: "SOGEFRPP",
};

const currency = (amount: number) =>
  amount.toLocaleString("fr-FR", {
    style: "currency",
    currency: "EUR",
  });

function getServiceValues(serviceLine: DocumentService) {
  return {
    description: serviceLine.description,
    quantity: serviceLine.quantity,
    unitPrice: serviceLine.unitPrice,
    unit: serviceLine.unit,
    taxRate: serviceLine.taxRate,
  };
}

function DocumentDisplayComponent({ document }: DocumentDisplayComponentProps) {
  const { user } = useAuthUser();
  const { activeCompany } = useActiveCompany();
  const isInvoice = document.type === "INVOICE";
  const services = document.services ?? [];
  const companyName = activeCompany?.name ?? fallbackCompany.name;
  const companyAddress = activeCompany?.address ?? fallbackCompany.address;
  const companyPostalCode =
    activeCompany?.postalCode ?? fallbackCompany.postalCode;
  const companyCity = activeCompany?.city ?? fallbackCompany.city;
  const companySiren = activeCompany?.siren ?? fallbackCompany.siren;
  const companyVatNumber =
    activeCompany?.vatNumber ?? fallbackCompany.vatNumber;
  const companyPhoneNumber =
    activeCompany?.phoneNumber ?? fallbackCompany.phoneNumber;
  const companyIban = activeCompany?.IBAN ?? fallbackCompany.iban;
  const companyBic = activeCompany?.BIC ?? fallbackCompany.bic;
  const contactEmail = document.author?.email ?? user?.email ?? "";

  const totalHT = services.reduce((sum, serviceLine) => {
    const { quantity, unitPrice } = getServiceValues(serviceLine);
    return sum + unitPrice * quantity;
  }, 0);
  const totalTVA = services.reduce((sum, serviceLine) => {
    const { quantity, unitPrice, taxRate } = getServiceValues(serviceLine);
    return sum + (unitPrice * quantity * taxRate) / 100;
  }, 0);
  const totalTTC = totalHT + totalTVA;

  return (
    <>
      <article className="mx-auto mt-5 w-full max-w-2xl overflow-hidden rounded-ui-control border border-ui-border bg-ui-surface text-xs leading-relaxed text-ui-text shadow-ui-card sm:mt-6 print:mt-0 print:max-w-none print:rounded-none print:border-0 print:shadow-none">
        <div className="flex justify-end px-4 pt-4 sm:px-7 sm:pt-5 print:hidden">
          <DocumentVersionSelector
            documentId={document.id}
            versionNumber={document.versionNumber}
            mode="display"
          />
        </div>
        <header className="px-4 pt-6 pb-5 sm:px-7 sm:pt-8 sm:pb-6">
          <div className="flex items-start justify-between gap-4">
            <CompanyLogo companyId={document.companyId} updatedAt={activeCompany?.logoUpdatedAt} className="w-20 sm:w-30" />
            <div className="min-w-0 text-right">
              <h1 className="font-title text-3xl font-semibold uppercase tracking-tight text-ui-text sm:text-4xl">
                {isInvoice ? "FACTURE" : "DEVIS"}
              </h1>
              <p className="mt-1 break-all text-sm font-medium text-ui-secondary">N° {document.documentNumber}</p>
              {document.contractStageInvoice && <p className="mt-1 text-xs font-semibold text-ui-primary">{document.contractStageInvoice.kind === "DEPOSIT" ? "Facture d’acompte" : "Facture de solde"}</p>}
            </div>
          </div>

          <div className="mt-8 grid gap-6 sm:grid-cols-2">
            <DocumentParty
              heading="Émise par"
              name={companyName}
              address={[companyAddress, `${companyPostalCode}, ${companyCity}`]}
              details={[
                { label: "Statut", value: "Micro-entreprise" },
                { label: "Tél.", value: companyPhoneNumber },
                { label: "SIREN", value: companySiren },
                { label: "TVA intracommunautaire", value: companyVatNumber },
                { label: "Email", value: contactEmail },
              ]}
            />
            <DocumentParty
              heading="À l’attention de"
              name={document.clientName}
              address={[document.clientAddress, `${document.clientPostalCode}, ${document.clientCity}, ${document.clientCountry}`]}
              details={[
                { label: "Email", value: document.clientEmail },
                ...(document.clientType === "BUSINESS" ? [
                  { label: "SIREN", value: document.clientSiren },
                  { label: "TVA intracommunautaire", value: document.clientVatNumber },
                ] : []),
              ]}
              right={false}
            />
          </div>
          <div className="mt-7 grid grid-cols-2 gap-4 border-y border-ui-border py-4">
            <div><p className="text-[10px] font-semibold uppercase tracking-wide text-ui-secondary">{isInvoice ? "Date d’émission" : "Date du devis"}</p><p className="mt-1 font-medium">{formatDate(isInvoice ? (document.sentAt ?? new Date().toISOString()) : document.createdAt)}</p></div>
            <div><p className="text-[10px] font-semibold uppercase tracking-wide text-ui-secondary">Date d’échéance</p><p className="mt-1 font-medium">{formatDate(document.paymentDueAt)}</p></div>
          </div>
        </header>

        <div className="px-4 pb-6 sm:px-7 sm:pb-7">
          <div className="space-y-3 sm:hidden">
            {services.length > 0 ? (
              services.map((serviceLine) => {
                const { description, quantity, unitPrice, unit, taxRate } =
                  getServiceValues(serviceLine);
                const lineTotalHT = quantity * unitPrice;
                const lineTotalTTC = lineTotalHT * (1 + taxRate / 100);

                return (
                  <article
                    key={serviceLine.id}
                    className="rounded-ui-control border border-ui-border bg-ui-subtle p-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <p className="font-semibold text-zinc-900">
                        {description}
                      </p>
                      <p className="shrink-0 font-title text-sm font-semibold text-ui-text">
                        {currency(lineTotalTTC)}
                      </p>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3 border-t border-ui-border pt-3 text-[11px]">
                      <ServiceDetail
                        label="Quantité"
                        value={`${quantity} ${unit}`}
                      />
                      <ServiceDetail
                        label="Prix HT"
                        value={currency(unitPrice)}
                        align="right"
                      />
                      <ServiceDetail label="TVA" value={`${taxRate} %`} />
                      <ServiceDetail
                        label="Total HT"
                        value={currency(lineTotalHT)}
                        align="right"
                      />
                    </div>
                  </article>
                );
              })
            ) : (
              <div className="rounded-xl border border-dashed border-zinc-200 px-4 py-6 text-center text-xs text-zinc-500">
                Aucune prestation.
              </div>
            )}
          </div>

          <div className="hidden overflow-hidden sm:block">
            <table className="w-full table-fixed border-collapse text-left text-[10px]">
              <colgroup>
                <col className="w-[37%]" />
                <col className="w-[7%]" />
                <col className="w-[13%]" />
                <col className="w-[12%]" />
                <col className="w-[7%]" />
                <col className="w-[12%]" />
                <col className="w-[12%]" />
              </colgroup>
              <thead className="whitespace-nowrap bg-ui-subtle">
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
                {services.length > 0 ? (
                  services.map((serviceLine) => {
                    const { description, quantity, unitPrice, unit, taxRate } =
                      getServiceValues(serviceLine);
                    const lineTotalHT = quantity * unitPrice;
                    const lineTotalTTC = lineTotalHT * (1 + taxRate / 100);

                    return (
                      <tr
                        key={serviceLine.id}
                        className="border-b border-zinc-100 last:border-b-zinc-200"
                      >
                        <td className="py-3 pl-1 pr-1.5 font-medium">
                          {description}
                        </td>
                        <td className="px-1.5 py-3">{quantity}</td>
                        <td className="whitespace-nowrap px-1.5 py-3">
                          {currency(unitPrice)}
                        </td>
                        <td className="px-1.5 py-3">{unit}</td>
                        <td className="px-1.5 py-3">{taxRate} %</td>
                        <td className="whitespace-nowrap px-1.5 py-3 text-right font-semibold">
                          {currency(lineTotalHT)}
                        </td>
                        <td className="whitespace-nowrap py-3 pl-1.5 pr-1 text-right font-semibold">
                          {currency(lineTotalTTC)}
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
            <div className="w-full max-w-60 space-y-2 bg-ui-subtle p-3 text-xs">
              <div className="flex items-center justify-between gap-4 text-ui-secondary">
                <p>Sous-total :</p>
                <p>{currency(totalHT)}</p>
              </div>

              <div className="flex items-center justify-between gap-4 text-ui-secondary">
                <p>Total TVA :</p>
                <p>{currency(totalTVA)}</p>
              </div>

              <div className="flex items-center justify-between gap-4 border-t border-ui-border pt-2 font-semibold text-ui-text">
                <p>TOTAL TTC :</p>
                <p>{currency(totalTTC)}</p>
              </div>
            </div>
          </div>

          <footer className="mt-7 grid gap-6 border-t border-zinc-200 pt-5 md:grid-cols-[1.1fr,0.9fr]">
            <section>
              <div className="mb-3 flex items-center gap-2 font-title font-semibold">
                <Landmark className="h-4 w-4 text-primary" />
                <h2>Coordonnées bancaires</h2>
              </div>

              <div className="grid gap-x-8 gap-y-2 sm:grid-cols-2">
                <p className="flex min-w-0 justify-between gap-4 break-all">
                  <b>Titulaire : {companyName}</b>
                </p>
                <p className="flex min-w-0 justify-between gap-4 break-all">
                  <b>IBAN : {companyIban}</b>
                </p>
                {activeCompany?.bank && (
                  <p className="flex min-w-0 justify-between gap-4 break-all">
                    <b>Banque : {activeCompany.bank}</b>
                  </p>
                )}
                <p className="flex min-w-0 justify-between gap-4 break-all">
                  <b>BIC : {companyBic}</b>
                </p>
              </div>
            </section>

            <section className="flex flex-col justify-between gap-6">
              <hr className="inline-block w-full text-primary" />
              <div className="text-right">
                <p className="text-[10px] text-zinc-500">
                  Merci pour votre confiance.
                </p>
                <p>{isInvoice ? "Facture" : "Devis"} fait avec Onetto</p>
              </div>
            </section>
          </footer>
        </div>
      </article>
    </>
  );
}

function ServiceDetail({
  label,
  value,
  align = "left",
}: {
  label: string;
  value: string;
  align?: "left" | "right";
}) {
  return (
    <div className={align === "right" ? "text-right" : undefined}>
      <p className="text-zinc-500">{label}</p>
      <p className="mt-0.5 font-semibold text-zinc-800">{value}</p>
    </div>
  );
}

export default DocumentDisplayComponent;
