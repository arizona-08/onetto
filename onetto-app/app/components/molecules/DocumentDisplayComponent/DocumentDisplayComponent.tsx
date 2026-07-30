"use client";

import { Document, DocumentService, InvoiceStatus, EstimateStatus } from '@/app/types'
import React from 'react'
import { useAuthUser } from '../../context/AuthUserContext';
import { CreditCard, Landmark } from 'lucide-react';
import { formatDate } from '@/shared/utils';

interface DocumentDisplayComponentProps {
  document: Document;
}

const invoiceStatusLabels: Record<InvoiceStatus, string> = {
  DRAFT: 'Brouillon',
  PENDING: 'En attente',
  PAID: 'Payée',
  OVERDUE: 'En retard',
}

const estimateStatusLabels: Record<EstimateStatus, string> = {
  DRAFT: 'Brouillon',
  SENT: 'Envoyée',
  ACCEPTED: 'Acceptée',
  REJECTED: 'Rejetée',
}

const fallbackIssuer = {
  companyName: 'Atelier Onetto Studio',
  legalForm: 'SASU',
  shareCapital: '8 000 €',
  siren: '918 245 637',
  siret: '918 245 637 00018',
  rcs: 'Paris B 918 245 637',
  vatNumber: 'FR 32 918245637',
  address: '14 avenue de la République',
  postalLine: '75011 Paris, France',
  quoteReference: 'DEV-2026-014',
  orderReference: 'CMD-2026-072',
  accountHolder: 'Atelier Onetto Studio',
  bankName: 'Société Générale',
  iban: 'FR76 3000 1007 9412 3456 7890 123',
  bic: 'SOGEFRPP',
}

const fallbackClient = {
  name: 'Maison Lavigne Conseil',
  email: 'contact@maison-lavigne.fr',
  address: '27 rue des Archives',
  postalCode: '75004',
  city: 'Paris',
  country: 'France',
  vatNumber: 'FR 78 412836925',
}

const fallbackService = {
  description: 'Conception d\'une identité visuelle et déclinaisons web',
  quantity: 1,
  unitPrice: 1290,
  unit: 'forfait',
  taxRate: 20,
}

function formatCurrency(amount: number) {
  return amount.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })
}

function displayOrFallback(value: string | undefined | null, fallback: string) {
  const cleanValue = value?.trim();
  return cleanValue && cleanValue.length > 0 ? cleanValue : fallback;
}

function getServiceValues(serviceLine: DocumentService) {
  return {
    description: displayOrFallback(serviceLine.description, fallbackService.description),
    quantity: serviceLine.quantity > 0 ? serviceLine.quantity : fallbackService.quantity,
    unitPrice: serviceLine.unitPrice > 0 ? serviceLine.unitPrice : fallbackService.unitPrice,
    unit: displayOrFallback(serviceLine.unit, fallbackService.unit),
    taxRate: serviceLine.taxRate > 0 ? serviceLine.taxRate : fallbackService.taxRate,
  }
}

function DocumentDisplayComponent({ document }: DocumentDisplayComponentProps) {
  const {user} = useAuthUser();
  const isInvoice = document.type === "INVOICE";
  const issuerFirstname = document.author?.firstname ?? user?.firstname ?? '';
  const issuerLastname = document.author?.lastname ?? user?.lastname ?? '';
  const issuerContactName = `${issuerFirstname} ${issuerLastname}`.trim() || 'Nina Martin';
  const issuerEmail = document.author?.email ?? user?.email ?? 'facturation@onetto-studio.fr';
  const clientName = displayOrFallback(document.clientName, fallbackClient.name);
  const clientEmail = displayOrFallback(document.clientEmail, fallbackClient.email);
  const clientAddress = displayOrFallback(document.clientAddress, fallbackClient.address);
  const clientPostalCode = displayOrFallback(document.clientPostalCode, fallbackClient.postalCode);
  const clientCity = displayOrFallback(document.clientCity, fallbackClient.city);
  const clientCountry = displayOrFallback(document.clientCountry, fallbackClient.country);
  const services = document.services ?? [];
  const fallbackTotalHT = fallbackService.quantity * fallbackService.unitPrice;
  const fallbackTotalTVA = fallbackTotalHT * (fallbackService.taxRate / 100);

  const totalHT = services.length > 0
    ? services.reduce((total, serviceLine) => {
      const { quantity, unitPrice } = getServiceValues(serviceLine);
      return total + (quantity * unitPrice);
    }, 0)
    : fallbackTotalHT;

  const totalTVA = services.reduce((total, serviceLine) => {
    const { quantity, unitPrice, taxRate } = getServiceValues(serviceLine);
    const lineTotalHT = quantity * unitPrice;
    return total + (lineTotalHT * (taxRate / 100));
  }, services.length > 0 ? 0 : fallbackTotalTVA);

  const computedTotalTTC = totalHT + totalTVA;
  const totalTTC = services.length > 0 ? computedTotalTTC : document.totalPrice || 1548;

  return (
    <article className="mx-auto mt-6 w-full max-w-[210mm] overflow-hidden rounded-md bg-white text-[11px] leading-relaxed text-zinc-950 shadow-[0_24px_70px_-45px_rgba(15,23,42,0.45)] print:mt-0 print:w-[210mm] print:max-w-none print:rounded-none print:shadow-none">
      <header className="bg-zinc-50 px-7 py-6 print:px-8 print:py-6">
        <div className="flex items-start justify-between gap-6">
          <div>
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-md bg-primary font-title text-sm font-black text-white">
                ON
              </div>
              <div>
                <p className="font-title text-xl font-black text-primary">{fallbackIssuer.companyName}</p>
                <p className="font-semibold uppercase text-zinc-500">Facturation professionnelle</p>
              </div>
            </div>

            <div className="text-zinc-700">
              <p className="font-semibold text-zinc-950">{issuerContactName}</p>
              <p>E-mail : {issuerEmail}</p>
              <p>{fallbackIssuer.address}</p>
              <p>{fallbackIssuer.postalLine}</p>
              <p>{fallbackIssuer.legalForm} au capital de {fallbackIssuer.shareCapital}</p>
              <p>SIREN : {fallbackIssuer.siren}</p>
              <p>SIRET : {fallbackIssuer.siret}</p>
              <p>RCS : {fallbackIssuer.rcs}</p>
              <p>TVA intracommunautaire : {fallbackIssuer.vatNumber}</p>
            </div>
          </div>

          <div className="md:text-right">
            <p className="font-title text-3xl font-black text-primary">Facture</p>
            <div className="mt-5 space-y-2">
              <div>
                <p className="font-semibold text-zinc-500">Numéro de facture</p>
                <p className="font-title text-xl font-black">{document.documentNumber}</p>
              </div>
              <div>
                <p className="font-semibold text-zinc-500">Date d&apos;émission</p>
                <p>{formatDate(document.createdAt)}</p>
              </div>
              <div>
                <p className="font-semibold text-zinc-500">Date d&apos;échéance</p>
                <p>{formatDate(document.paymentDueAt)}</p>
              </div>
              <div>
                <p className="font-semibold text-zinc-500">Statut</p>
                <p className="font-semibold text-primary">{isInvoice ? invoiceStatusLabels[document.invoiceStatus] : estimateStatusLabels[document.estimateStatus]}</p>
              </div>
              <p>Réf. devis : {fallbackIssuer.quoteReference}</p>
              <p>Réf. commande : {fallbackIssuer.orderReference}</p>
            </div>
          </div>
        </div>

        <div className="mt-7 grid gap-6 md:grid-cols-2">
          <section className="p-3 rounded-md bg-primary/20">
            <p className="mb-2 font-bold uppercase text-zinc-500">Émetteur</p>
            <div className="space-y-0.5">
              <p className="font-title text-lg font-black">{fallbackIssuer.companyName}</p>
              <p>{issuerContactName}</p>
              <p>{issuerEmail}</p>
              <p>{fallbackIssuer.address}</p>
              <p>{fallbackIssuer.postalLine}</p>
            </div>
          </section>

          <section className="p-3 rounded-md bg-primary/20">
            <p className="mb-2 font-bold uppercase text-zinc-500">Destinataire</p>
            <div className="space-y-0.5">
              <p className="font-title text-lg font-black">{clientName}</p>
              <p>{clientEmail}</p>
              <p>{clientAddress}</p>
              <p>{clientPostalCode} {clientCity}, {clientCountry}</p>
              <p>TVA intracommunautaire : {fallbackClient.vatNumber}</p>
            </div>
          </section>
        </div>
      </header>

      <div className="px-7 py-6 print:px-8 print:py-6">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-left text-[10px]">
            <thead>
              <tr className="border-b border-zinc-200 font-bold uppercase text-zinc-600">
                <th className="py-2.5 pr-3">Description</th>
                <th className="px-3 py-2.5">Qté</th>
                <th className="px-3 py-2.5">Prix HT</th>
                <th className="px-3 py-2.5">Unité</th>
                <th className="px-3 py-2.5">TVA</th>
                <th className="px-3 py-2.5 text-right">Total HT</th>
                <th className="py-2.5 pl-3 text-right">Total TTC</th>
              </tr>
            </thead>
            <tbody>
              {services.length > 0 ? services.map((serviceLine) => {
                const { description, quantity, unitPrice, unit, taxRate } = getServiceValues(serviceLine);
                const lineTotalHT = quantity * unitPrice
                const lineTotalTTC = lineTotalHT + (lineTotalHT * (taxRate / 100))

                return (
                  <tr key={serviceLine.id} className="border-b border-zinc-100 last:border-b-zinc-200">
                    <td className="py-3 pr-3 font-medium">{description}</td>
                    <td className="px-3 py-3">{quantity}</td>
                    <td className="px-3 py-3">{formatCurrency(unitPrice)}</td>
                    <td className="px-3 py-3">{unit}</td>
                    <td className="px-3 py-3">{taxRate} %</td>
                    <td className="px-3 py-3 text-right font-semibold">{formatCurrency(lineTotalHT)}</td>
                    <td className="py-3 pl-3 text-right font-semibold">{formatCurrency(lineTotalTTC)}</td>
                  </tr>
                )
              }) : (
                <tr className="border-b border-zinc-100">
                  <td className="py-3 pr-3 font-medium">{fallbackService.description}</td>
                  <td className="px-3 py-3">{fallbackService.quantity}</td>
                  <td className="px-3 py-3">{formatCurrency(fallbackService.unitPrice)}</td>
                  <td className="px-3 py-3">{fallbackService.unit}</td>
                  <td className="px-3 py-3">{fallbackService.taxRate} %</td>
                  <td className="px-3 py-3 text-right font-semibold">{formatCurrency(fallbackTotalHT)}</td>
                  <td className="py-3 pl-3 text-right font-semibold">{formatCurrency(fallbackTotalHT + fallbackTotalTVA)}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1.15fr,0.85fr]">
          <div className="space-y-4">
            <section className="border-l-3 border-primary pl-4">
              <div className="mb-2 flex items-center gap-2 font-title font-black">
                <CreditCard className="h-4 w-4 text-primary" />
                <h2>Conditions de paiement</h2>
              </div>
              <div className="space-y-0.5 text-zinc-700">
                <p><span className="font-semibold text-zinc-950">Date d&apos;échéance :</span> {formatDate(document.paymentDueAt)}</p>
                <p><span className="font-semibold text-zinc-950">Moyen de paiement accepté :</span> virement bancaire</p>
                <p><span className="font-semibold text-zinc-950">Escompte pour paiement anticipé :</span> néant</p>
              </div>
            </section>

            <section className="border-l-3 border-primary pl-4">
              <div className="mb-2 flex items-center gap-2 font-title font-black">
                <CreditCard className="h-4 w-4 text-primary" />
                <h2>Pénalités de retard</h2>
              </div>
              <div className="space-y-0.5 text-zinc-700">
                <p>Tout retard de paiement entraînera l&apos;application de pénalités au taux de 10 % par an.</p>
                <p>Indemnité forfaitaire pour frais de recouvrement : 40 €.</p>
                <p>Référence : article L.441-10 du Code de commerce.</p>
              </div>
            </section>
          </div>

          <aside className="self-start border border-zinc-200 p-4">
            <div className="flex items-center justify-between gap-8">
              <span>Total HT</span>
              <span className="font-semibold">{formatCurrency(totalHT)}</span>
            </div>
            <div className="mt-2 flex items-center justify-between gap-8">
              <span>TVA</span>
              <span className="font-semibold">{formatCurrency(totalTVA)}</span>
            </div>
            <div className="my-3 h-px bg-zinc-200" />
            <div className="flex items-center justify-between gap-8">
              <span className="font-title text-sm font-black">Total TTC</span>
              <span className="font-title text-xl font-black text-primary">{formatCurrency(totalTTC)}</span>
            </div>
            <div className="mt-4 flex items-center justify-between gap-8 border-t border-zinc-200 pt-3">
              <span className="font-semibold">Solde dû</span>
              <span className="font-title text-lg font-black text-primary">{formatCurrency(totalTTC)}</span>
            </div>
          </aside>
        </div>

        <footer className="mt-7 grid gap-6 border-t border-zinc-200 pt-5 md:grid-cols-[1.1fr,0.9fr]">
          <section>
            <div className="mb-3 flex items-center gap-2 font-title font-black">
              <Landmark className="h-4 w-4 text-primary" />
              <h2>Coordonnées bancaires</h2>
            </div>

            <div className="flex flex-col md:flex-row md:items-center md:justify-around">
              {/* left */}
              <div className="flex flex-col md:gap-2">
                <div className="flex items-center justify-between gap-10">
                  <span className="font-semibold text-zinc-950">Titulaire du compte</span>
                  <span className="font-mono text-[10px] text-primary">{fallbackIssuer.accountHolder}</span>
                </div>

                <div className="flex items-center justify-between gap-10">  
                  <span className="font-semibold text-zinc-950">Banque</span>
                  <span className="font-mono text-[10px] text-primary">{fallbackIssuer.bankName}</span>
                </div>
              </div>

              {/* right */}
              <div className="flex flex-col md:gap-2">
                <div className="flex items-center justify-between gap-10">
                  <span className="font-semibold text-zinc-950">IBAN</span>
                  <span className="font-mono text-[10px] text-primary">{fallbackIssuer.iban}</span>
                </div>

                <div className="flex items-center justify-between gap-10">
                  <span className="font-semibold text-zinc-950">BIC</span>
                  <span className="font-mono text-[10px] text-primary">{fallbackIssuer.bic}</span>
                </div>
              </div>

            </div>
          </section>

          <section className="flex flex-col justify-between gap-6">
            <div>
              <p className="font-semibold">Facture émise par {issuerContactName}</p>
              <div className="mt-8 h-px w-full bg-zinc-200" />
            </div>
            <p className="text-[10px] text-zinc-500">Merci pour votre confiance.</p>
            <p>Facture faite avec Onetto</p>
          </section>
        </footer>
      </div>
    </article>
  )
}

export default DocumentDisplayComponent
