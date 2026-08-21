'use client';

import CreateCompanyForm from '@/app/components/molecules/Forms/CreateCompanyForm';
import {
  CompanyInvoiceFeeDetails,
  getCompany,
  getCompanyInvoiceFeeDetails,
  getGoCardlessAuthorizationUrl,
  getGoCardlessVerificationStatusUrl,
} from '@/lib/companies/companies';
import { Company } from '@/lib/companies/dtos/create-company.dto';
import {
  ArrowLeft,
  Building2,
  CreditCard,
  Landmark,
  ReceiptText,
} from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import React from 'react';

const paymentMethodLabels = {
  CREDIT_CARD: 'Carte bancaire',
  BANK_TRANSFER: 'Virement bancaire',
  CHECK: 'Chèque',
  CASH: 'Espèces',
  OTHER: 'Autre',
} as const;

function formatCurrency(amountInCents: number) {
  return (amountInCents / 100).toLocaleString('fr-FR', {
    style: 'currency',
    currency: 'EUR',
  });
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(date));
}

function InformationItem({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-zinc-400">{label}</dt>
      <dd className="mt-1 wrap-break-words text-sm font-medium text-zinc-800">
        {value || 'Non renseigné'}
      </dd>
    </div>
  );
}

function MyCompanyPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [company, setCompany] = React.useState<Company | null>(null);
  const [feeDetails, setFeeDetails] = React.useState<CompanyInvoiceFeeDetails | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [isGoCardlessAuthorizationPending, setIsGoCardlessAuthorizationPending] = React.useState(false);
  const [goCardlessAuthorizationError, setGoCardlessAuthorizationError] = React.useState<string | null>(null);
  const [isGoCardlessVerificationPending, setIsGoCardlessVerificationPending] = React.useState(false);

  React.useEffect(() => {
    async function loadCompanyDetails() {
      const [companyResponse, feesResponse] = await Promise.all([
        getCompany(params.id),
        getCompanyInvoiceFeeDetails(params.id),
      ]);

      if (!companyResponse.ok) {
        setError('Impossible de charger cette entreprise.');
        return;
      }

      setCompany(companyResponse.data);

      if (feesResponse.ok) {
        setFeeDetails(feesResponse.data);
      }
    }

    void loadCompanyDetails();
  }, [params.id]);

  async function startGoCardlessAuthorization() {
    if (!company) return;

    setIsGoCardlessAuthorizationPending(true);
    setGoCardlessAuthorizationError(null);

    const response = await getGoCardlessAuthorizationUrl(company.id, company.email);

    if (!response.ok) {
      setGoCardlessAuthorizationError('Impossible de démarrer la connexion à GoCardless. Réessayez dans quelques instants.');
      setIsGoCardlessAuthorizationPending(false);
      return;
    }

    // console.log(response.data);

    window.location.assign(response.data.url);
  }

  function verifyGoCardlessAccount() {
    const companyPaymentAccountId = company?.companyPaymentAccount?.id;
    if (!companyPaymentAccountId) return;

    setIsGoCardlessVerificationPending(true);
    window.location.assign(getGoCardlessVerificationStatusUrl(companyPaymentAccountId));
  }

  return (
    <div className="mx-auto w-full max-w-6xl p-4">
      <Link
        href="/my-companies"
        className="inline-flex items-center gap-2 text-sm font-medium text-zinc-600 hover:text-primary"
      >
        <ArrowLeft className="h-4 w-4" /> Retour aux entreprises
      </Link>

      {error && (
        <p role="alert" className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </p>
      )}
      {!error && !company && (
        <p className="mt-6 text-sm text-zinc-500">Chargement de l’entreprise…</p>
      )}

      {company && (
        <>
          <section className="mt-6 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Building2 className="h-6 w-6" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-sm font-medium text-zinc-500">Entreprise</p>
                  <h1 className="mt-1 font-title text-2xl font-black text-zinc-900">
                    {company.name}
                  </h1>
                  <p className="mt-1 text-sm text-zinc-600">{company.email}</p>
                </div>
              </div>
              <span className={`w-fit rounded-full px-3 py-1 text-xs font-semibold ${
                company.status === 'CLOSED'
                  ? 'bg-red-100 text-red-700'
                  : 'bg-emerald-100 text-emerald-700'
              }`}>
                {company.status === 'CLOSED' ? 'Fermée' : 'Active'}
              </span>
            </div>

            <dl className="mt-7 grid gap-x-8 gap-y-6 border-t border-zinc-100 pt-6 sm:grid-cols-2 lg:grid-cols-3">
              <InformationItem label="Téléphone" value={company.phoneNumber} />
              <InformationItem label="Adresse" value={company.address} />
              <InformationItem label="Ville" value={`${company.postalCode} ${company.city}`} />
              <InformationItem label="Pays" value={company.country} />
              <InformationItem label="SIREN" value={company.siren} />
              <InformationItem label="SIRET" value={company.siret} />
              <InformationItem label="TVA intracommunautaire" value={company.vatNumber} />
              <InformationItem label="IBAN" value={company.IBAN} />
              <InformationItem label="BIC" value={company.BIC} />
            </dl>
          </section>

          <section className="mt-6 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm font-medium text-zinc-500">Frais de factures encaissées</p>
                <h2 className="mt-1 font-title text-3xl font-black text-zinc-900">
                  {feeDetails ? formatCurrency(feeDetails.currentPeriodAmountInCents) : '—'}
                </h2>
                {feeDetails && (
                  <p className="mt-1 text-sm text-zinc-500">
                    {feeDetails.paidInvoicesCount} facture{feeDetails.paidInvoicesCount > 1 ? 's' : ''} encaissée{feeDetails.paidInvoicesCount > 1 ? 's' : ''} depuis le 1er {formatDate(feeDetails.periodStart)}
                  </p>
                )}
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <ReceiptText className="h-5 w-5" aria-hidden="true" />
              </div>
            </div>

            <div className="mt-7 overflow-x-auto rounded-xl border border-zinc-100">
              <table className="min-w-150 w-full text-left text-sm">
                <thead className="bg-zinc-50 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  <tr>
                    <th className="px-5 py-4">Facture</th>
                    <th className="px-5 py-4">Date</th>
                    <th className="px-5 py-4">Moyen de paiement</th>
                    <th className="px-5 py-4 text-right">Frais</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 text-zinc-700">
                  {feeDetails?.history.map((fee) => (
                    <tr key={fee.id}>
                      <td className="px-5 py-4 font-semibold text-zinc-900">
                        <Link href={`/documents/${fee.invoice.id}`} className="hover:text-primary hover:underline">
                          {fee.invoice.documentNumber || 'Facture sans numéro'}
                        </Link>
                      </td>
                      <td className="px-5 py-4 text-zinc-500">{formatDate(fee.createdAt)}</td>
                      <td className="px-5 py-4">
                        <span className="inline-flex items-center gap-2">
                          {fee.paymentMethod === 'BANK_TRANSFER' ? (
                            <Landmark className="h-4 w-4 text-zinc-400" aria-hidden="true" />
                          ) : (
                            <CreditCard className="h-4 w-4 text-zinc-400" aria-hidden="true" />
                          )}
                          {fee.paymentMethod
                            ? paymentMethodLabels[fee.paymentMethod]
                            : 'Non renseigné'}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right font-semibold text-zinc-900">
                        {formatCurrency(fee.amountInCents)}
                      </td>
                    </tr>
                  ))}
                  {feeDetails && feeDetails.history.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-5 py-8 text-center text-zinc-500">
                        Aucun frais de facture pour cette entreprise.
                      </td>
                    </tr>
                  )}
                  {!feeDetails && (
                    <tr>
                      <td colSpan={4} className="px-5 py-8 text-center text-zinc-500">
                        Chargement de l’historique des frais…
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section>
            {company.isPaymentAccountConnected === false && (
              <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                    <Landmark className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <div>
                    <h2 className="font-title text-lg font-bold text-zinc-900">
                      Connectez votre compte GoCardless
                    </h2>
                    <p className="mt-1 text-sm leading-6 text-zinc-700">
                      Créez puis connectez un compte GoCardless pour permettre à vos clients de vous régler et recevoir vos paiements.
                    </p>
                    <button
                      type="button"
                      onClick={() => void startGoCardlessAuthorization()}
                      disabled={isGoCardlessAuthorizationPending}
                      className="mt-4 inline-flex items-center rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isGoCardlessAuthorizationPending ? 'Redirection en cours…' : 'Créer ou connecter mon compte GoCardless'}
                    </button>
                    {goCardlessAuthorizationError && (
                      <p role="alert" className="mt-3 text-sm font-medium text-red-700">
                        {goCardlessAuthorizationError}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}


            {(company.isPaymentAccountConnected && company.companyPaymentAccount?.verificationStatus === 'NOT_VERIFIED') && (
              <div className="mt-6 rounded-lg border border-orange-100 bg-orange-50/70 p-5">
                <h2 className="font-title text-lg font-bold text-zinc-900">Compte GoCardless non vérifié</h2>
                <p className="mt-2 text-sm text-zinc-600">
                  Veuillez vérifier votre compte GoCardless pour commencer à recevoir vos paiements.
                </p>
                  <button
                    type="button"
                    onClick={verifyGoCardlessAccount}
                    disabled={isGoCardlessVerificationPending}
                    className="mt-4 rounded-md bg-orange-300 p-3 text-sm hover:bg-orange-200 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isGoCardlessVerificationPending ? 'Vérification en cours…' : 'Vérifier mon compte GoCardless'}
                  </button>
                  <button
                    type="button"
                    onClick={() => void startGoCardlessAuthorization()}
                    disabled={isGoCardlessAuthorizationPending}
                    className="ml-3 rounded-md border border-orange-300 px-3 py-3 text-sm text-orange-900 hover:bg-orange-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isGoCardlessAuthorizationPending ? 'Redirection en cours…' : 'Reconnecter mon compte'}
                  </button>
              </div>
            )}

            {company.isPaymentAccountConnected && company.companyPaymentAccount?.verificationStatus === 'IN_REVIEW' && (
              <div className="mt-6 rounded-lg border border-blue-100 bg-blue-50/70 p-5">
                <h2 className="font-title text-lg font-bold text-zinc-900">Vérification GoCardless en cours</h2>
                <p className="mt-2 text-sm text-zinc-600">
                  GoCardless examine les informations de votre compte. Vous serez averti dès que la vérification sera terminée.
                </p>
              </div>
            )}
          </section>

          {company.status === 'CLOSED' && (
            <div className="mt-6 rounded-lg border border-red-100 bg-red-50/70 p-5">
              <h2 className="font-title text-lg font-bold text-zinc-900">Entreprise fermée</h2>
              <p className="mt-2 text-sm text-zinc-600">
                Cette entreprise est conservée en consultation. Ses informations ne peuvent plus être modifiées.
              </p>
              {company.closingReason && (
                <p className="mt-3 text-sm text-zinc-700">
                  <span className="font-semibold">Motif de fermeture :</span> {company.closingReason}
                </p>
              )}
            </div>
          )}

          {company.status !== 'CLOSED' && (
            <section className="mt-6">
              <h2 className="font-title text-xl font-black text-zinc-900">Modifier l’entreprise</h2>
              <p className="mt-1 text-sm text-zinc-500">Mettez à jour les informations de votre entreprise.</p>
              <div className="mt-4 rounded-2xl border border-zinc-200 bg-zinc-50">
                <CreateCompanyForm
                  companyToEdit={company}
                  onCancel={() => router.push('/my-companies')}
                  onSuccess={() => router.push('/my-companies')}
                />
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

export default MyCompanyPage;
