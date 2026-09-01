'use client';

import { CreateCompanyDto } from '@/lib/companies/dtos/create-company.dto';
import { Company } from '@/lib/companies/dtos/create-company.dto';
import { createCompany, getSuperPdpConnectionStatus, getSuperPdpEreportingOverview, startSuperPdpAuthorization, SuperPdpConnectionStatus, SuperPdpEreportingOverview, updateCompany } from '@/lib/companies/companies';
import { useRouter } from 'next/navigation';
import { notifyCompanyUpdated } from '@/lib/companies/company-events';
import { useToast } from '../../context/ToastContext';
import { refreshAuthenticationCookies } from '@/lib/auth/auth';
import React, { useEffect, useState } from 'react'

interface CreateCompanyFormProps {
  companyToEdit?: Company;
  onSuccess?: (company: Company) => void;
  onCancel?: () => void;
}

const emptyCompany: CreateCompanyDto = {
    name: "",
    email: "",
    phoneNumber: "",
    siren: "",
    siret: "",
    address: "",
    postalCode: "",
    city: "",
    country: "",
  subjectToVat: false,
  legalStatus: 'MICRO_ENTERPRISE',
  vatRegime: 'VAT_EXEMPTION',
  isVatExempt: true,
  vatExigibility: 'UNKNOWN',
  electronicAddress: '',
  electronicAddressScheme: 'SIREN',
    vatNumber: "",
    IBAN: "",
  BIC: "",
};

function CreateCompanyForm({ companyToEdit, onSuccess, onCancel }: CreateCompanyFormProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [companyInfos, setCompanyInfos] = useState<CreateCompanyDto>(companyToEdit ?? emptyCompany);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConnectingSuperPdp, setIsConnectingSuperPdp] = useState(false);
  const [superPdpConnection, setSuperPdpConnection] = useState<SuperPdpConnectionStatus>(null);
  const [ereportingOverview, setEreportingOverview] = useState<SuperPdpEreportingOverview | null>(null);
  const [isLoadingEreporting, setIsLoadingEreporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inputClassName = "rounded-md border border-zinc-200 bg-custom-gray-light px-4 py-3 text-sm text-zinc-800 outline-none transition-colors focus:border-primary focus:bg-white";
  const labelClassName = "font-title text-xs font-semibold uppercase tracking-wide text-zinc-600";

  useEffect(() => {
    if (!companyToEdit) return;
    void getSuperPdpConnectionStatus(companyToEdit.id).then((response) => {
      if (response.ok) setSuperPdpConnection(response.data);
    });
  }, [companyToEdit]);

  async function loadEreportingOverview() {
    if (!companyToEdit) return;
    setIsLoadingEreporting(true);
    const response = await getSuperPdpEreportingOverview(companyToEdit.id);
    setIsLoadingEreporting(false);
    if (response.ok) setEreportingOverview(response.data);
    else showToast('Impossible de synchroniser le suivi e-reporting.', 'error');
  }

  function handleInputChange(event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value, type } = event.target;
    const checked =
      event.target instanceof HTMLInputElement ? event.target.checked : false;
    const fieldName = name as keyof CreateCompanyDto;

    setCompanyInfos(prevState => {
      if (fieldName === 'subjectToVat') {
        return {
          ...prevState,
          subjectToVat: checked,
          vatNumber: checked ? prevState.vatNumber : "",
          vatExigibility: checked ? prevState.vatExigibility : 'UNKNOWN',
        };
      }

      return {
        ...prevState,
        [fieldName]: type === 'checkbox' ? checked : value,
      };
    });
  }

  const legalStatusLabels: Record<CreateCompanyDto['legalStatus'], string> = {
    MICRO_ENTERPRISE: 'Micro-entreprise', INDIVIDUAL_ENTREPRENEUR: 'Entrepreneur individuel', EIRL: 'EIRL', EURL: 'EURL', SARL: 'SARL', SELARL: 'SELARL', SASU: 'SASU', SAS: 'SAS', SELAS: 'SELAS', SA: 'SA', SELAFA: 'SELAFA', SCA: 'Société en commandite par actions', SELCA: 'SELCA', SNC: 'SNC', SCS: 'Société en commandite simple', SLP: 'Société de libre partenariat', SOCIETE_CIVILE: 'Société civile', SCI: 'SCI', SCM: 'SCM', SCP: 'SCP', EARL: 'EARL', GAEC: 'GAEC', SCEA: 'SCEA', GIE: 'GIE', ASSOCIATION: 'Association', FONDATION: 'Fondation', MUTUELLE: 'Mutuelle', COOPERATIVE: 'Coopérative', ETABLISSEMENT_PUBLIC: 'Établissement public', COLLECTIVITE_TERRITORIALE: 'Collectivité territoriale', SOCIETE_ETRANGERE: 'Société étrangère', OTHER: 'Autre forme juridique',
  };

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const companyPayload: CreateCompanyDto = {
      name: companyInfos.name,
      email: companyInfos.email,
      phoneNumber: companyInfos.phoneNumber,
      siren: companyInfos.siren,
      siret: companyInfos.siret,
      address: companyInfos.address,
      city: companyInfos.city,
      postalCode: companyInfos.postalCode,
      country: companyInfos.country,
      subjectToVat: companyInfos.subjectToVat,
      legalStatus: companyInfos.legalStatus,
      vatRegime: companyInfos.vatRegime,
      isVatExempt: companyInfos.isVatExempt,
      vatExigibility: companyInfos.vatExigibility,
      electronicAddress: companyInfos.electronicAddress,
      electronicAddressScheme: companyInfos.electronicAddressScheme,
      vatNumber: companyInfos.vatNumber,
      IBAN: companyInfos.IBAN,
      BIC: companyInfos.BIC,
    };

    if (companyToEdit) {
      const response = await updateCompany(companyToEdit.id, companyPayload);
      setIsSubmitting(false);
      if (!response.ok) {
        const message = typeof response.error.message === 'string' ? response.error.message : 'Impossible d’enregistrer l’entreprise.';
        setError(message);
        showToast(message, 'error');
        return;
      }
      notifyCompanyUpdated();
      showToast('Les informations de l’entreprise ont été enregistrées.', 'success');
      onSuccess?.(response.data);
      return;
    }

    const response = await createCompany(companyPayload);
    setIsSubmitting(false);
    if (!response.ok) {
      const message = typeof response.error.message === 'string' ? response.error.message : 'Impossible d’enregistrer l’entreprise.';
      setError(message);
      showToast(message, 'error');
      return;
    }
    notifyCompanyUpdated();
    showToast('L’entreprise a été créée et sélectionnée.', 'success');
    if (onSuccess) {
      onSuccess(response.data.company);
      return;
    }
    router.push('/dashboard');
  }

  async function handleConnectSuperPdp() {
    if (!companyToEdit) return;
    setIsConnectingSuperPdp(true);
    const refreshResponse = await refreshAuthenticationCookies();
    if (!refreshResponse.ok) {
      setIsConnectingSuperPdp(false);
      showToast('Votre session a expiré. Reconnectez-vous avant de connecter SuperPDP.', 'error');
      return;
    }
    const response = await startSuperPdpAuthorization(companyToEdit.id);
    setIsConnectingSuperPdp(false);
    if (!response.ok) {
      showToast('Impossible de démarrer la connexion SuperPDP.', 'error');
      return;
    }
    window.location.assign(response.data.url);
  }

  return (
    <form className="space-y-5 p-6 bg-white rounded-md" onSubmit={handleSubmit}>
      <h2 className="text-lg font-semibold text-zinc-800">Renseignez les informations de votre entreprise</h2>

      {companyToEdit && (
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
          <p className="text-sm font-semibold text-zinc-800">Facturation électronique</p>
          <p className="mt-1 text-xs text-zinc-600">
            {superPdpConnection?.status === 'ACTIVE'
              ? 'SuperPDP est connecté pour cette entreprise.'
              : superPdpConnection?.lastError
                ? 'La connexion SuperPDP doit être renouvelée pour utiliser la facturation électronique.'
                : 'Connectez cette entreprise à SuperPDP avant d’envoyer vos déclarations B2C.'}
          </p>
          <button type="button" onClick={handleConnectSuperPdp} disabled={isConnectingSuperPdp} className="mt-3 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60">
            {isConnectingSuperPdp ? 'Redirection…' : superPdpConnection?.status === 'ACTIVE' ? 'Reconnecter SuperPDP' : 'Connecter SuperPDP'}
          </button>
          {superPdpConnection?.status === 'ACTIVE' && (
            <button type="button" onClick={loadEreportingOverview} disabled={isLoadingEreporting} className="ml-2 mt-3 rounded-md border border-primary px-3 py-2 text-sm font-semibold text-primary transition-colors hover:bg-primary hover:text-white disabled:cursor-not-allowed disabled:opacity-60">
              {isLoadingEreporting ? 'Synchronisation…' : 'Voir le suivi e-reporting'}
            </button>
          )}
          {ereportingOverview && (
            <div className="mt-4 space-y-4 text-xs text-zinc-700">
              <p><strong>{ereportingOverview.transactions.data?.length ?? 0}</strong> transaction(s) B2C · <strong>{ereportingOverview.payments.data?.length ?? 0}</strong> paiement(s) · <strong>{ereportingOverview.ereportings.data?.length ?? 0}</strong> e-reporting(s) agrégé(s)</p>
              <div className="overflow-x-auto rounded-md border border-zinc-200 bg-white">
                <table className="min-w-full text-left"><thead className="bg-zinc-50 text-zinc-500"><tr><th className="px-3 py-2">Facture</th><th className="px-3 py-2">Type</th><th className="px-3 py-2">Statut</th><th className="px-3 py-2">Détail</th><th className="px-3 py-2">Créée le</th></tr></thead>
                  <tbody>{ereportingOverview.submissions.map((submission) => <tr key={submission.id} className="border-t border-zinc-100"><td className="px-3 py-2">{submission.document?.documentNumber ?? '—'}</td><td className="px-3 py-2">{submission.kind === 'PAYMENT' ? 'Paiement' : 'Transaction'}</td><td className="px-3 py-2">{getEreportingStatusLabel(submission.status)}</td><td className="max-w-md whitespace-pre-wrap break-words px-3 py-2 text-rose-700">{submission.status === 'FAILED' ? submission.lastError ?? 'Aucun détail fourni.' : '—'}</td><td className="px-3 py-2">{new Date(submission.createdAt).toLocaleDateString('fr-FR')}</td></tr>)}{!ereportingOverview.submissions.length && <tr><td colSpan={5} className="px-3 py-3 text-zinc-500">Aucune déclaration transmise.</td></tr>}</tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {error && <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <div className="flex flex-col gap-2">
        <label htmlFor="name" className={labelClassName}>
          Nom de l&apos;entreprise
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          value={companyInfos.name}
          onChange={handleInputChange}
          placeholder="Atelier Onetto"
          className={inputClassName}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <label htmlFor="email" className={labelClassName}>
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            value={companyInfos.email}
            onChange={handleInputChange}
            placeholder="contact@entreprise.fr"
            className={inputClassName}
          />
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="phoneNumber" className={labelClassName}>
            Téléphone
          </label>
          <input
            id="phoneNumber"
            name="phoneNumber"
            type="tel"
            required
            value={companyInfos.phoneNumber}
            onChange={handleInputChange}
            placeholder="06 12 34 56 78"
            className={inputClassName}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <label htmlFor="electronicAddress" className={labelClassName}>Adresse électronique de facturation</label>
          <input id="electronicAddress" name="electronicAddress" type="text" required value={companyInfos.electronicAddress} onChange={handleInputChange} placeholder="Votre SIREN" className={inputClassName} />
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="electronicAddressScheme" className={labelClassName}>Type d&apos;identifiant</label>
          <select id="electronicAddressScheme" name="electronicAddressScheme" required value={companyInfos.electronicAddressScheme} onChange={handleInputChange} className={inputClassName}>
            <option value="SIREN">SIREN</option><option value="SIRET">SIRET</option><option value="VAT">TVA intracommunautaire</option><option value="GLN">GLN</option><option value="PEPPOL">Peppol</option>
          </select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <label htmlFor="legalStatus" className={labelClassName}>Statut juridique</label>
          <select id="legalStatus" name="legalStatus" required value={companyInfos.legalStatus} onChange={handleInputChange} className={inputClassName}>
            {Object.entries(legalStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="vatRegime" className={labelClassName}>Régime de TVA</label>
          <select id="vatRegime" name="vatRegime" required value={companyInfos.vatRegime} onChange={handleInputChange} className={inputClassName}>
            <option value="VAT_EXEMPTION">Franchise en base de TVA</option>
            <option value="MONTHLY">Régime réel normal mensuel</option>
            <option value="QUARTERLY">Régime réel normal trimestriel</option>
            <option value="SIMPLIFIED">Régime réel simplifié</option>
          </select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <label htmlFor="siren" className={labelClassName}>
            SIREN
          </label>
          <input
            id="siren"
            name="siren"
            type="text"
            required
            value={companyInfos.siren}
            onChange={handleInputChange}
            placeholder="123 456 789"
            className={inputClassName}
          />
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="siret" className={labelClassName}>
            SIRET
          </label>
          <input
            id="siret"
            name="siret"
            type="text"
            required
            value={companyInfos.siret}
            onChange={handleInputChange}
            placeholder="123 456 789 00012"
            className={inputClassName}
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="address" className={labelClassName}>
          Adresse
        </label>
        <input
          id="address"
          name="address"
          type="text"
          required
          value={companyInfos.address}
          onChange={handleInputChange}
          placeholder="10 rue de la Paix"
          className={inputClassName}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="flex flex-col gap-2">
          <label htmlFor="postalCode" className={labelClassName}>
            Code postal
          </label>
          <input
            id="postalCode"
            name="postalCode"
            type="text"
            required
            value={companyInfos.postalCode}
            onChange={handleInputChange}
            placeholder="75001"
            className={inputClassName}
          />
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="city" className={labelClassName}>
            Ville
          </label>
          <input
            id="city"
            name="city"
            type="text"
            required
            value={companyInfos.city}
            onChange={handleInputChange}
            placeholder="Paris"
            className={inputClassName}
          />
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="country" className={labelClassName}>
            Pays
          </label>
          <input
            id="country"
            name="country"
            type="text"
            required
            value={companyInfos.country}
            onChange={handleInputChange}
            placeholder="France"
            className={inputClassName}
          />
        </div>
      </div>

      <label className="flex items-start gap-2 text-xs leading-5 text-zinc-500">
        <input
          id="subjectToVat"
          name="subjectToVat"
          type="checkbox"
          checked={companyInfos.subjectToVat}
          onChange={handleInputChange}
          className="mt-1 h-4 w-4 rounded border-zinc-300 accent-primary"
        />
        <span>Cette entreprise est assujettie à la TVA.</span>
      </label>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex items-start gap-2 text-xs leading-5 text-zinc-500">
          <input id="isVatExempt" name="isVatExempt" type="checkbox" checked={companyInfos.isVatExempt} onChange={handleInputChange} className="mt-1 h-4 w-4 rounded border-zinc-300 accent-primary" />
          <span>Cette entreprise bénéficie d&apos;une exonération de TVA.</span>
        </label>
        <div className="flex flex-col gap-2">
          <label htmlFor="vatExigibility" className={labelClassName}>Exigibilité de la TVA</label>
          <select id="vatExigibility" name="vatExigibility" value={companyInfos.vatExigibility} onChange={handleInputChange} disabled={!companyInfos.subjectToVat} className={inputClassName}>
            <option value="UNKNOWN">Je ne sais pas</option>
            <option value="ON_COLLECTION">À l’encaissement</option>
            <option value="ON_DEBITS">Sur les débits / à la facturation</option>
          </select>
          <p className="text-xs leading-5 text-zinc-500">Ce choix sert uniquement à savoir si les paiements doivent être déclarés. En cas de doute, vérifiez auprès de votre expert-comptable.</p>
        </div>
      </div>

      {companyInfos.subjectToVat && (
        <div className="flex flex-col gap-2">
          <label htmlFor="vatNumber" className={labelClassName}>
            Numéro de TVA intracommunautaire
          </label>
          <input
            id="vatNumber"
            name="vatNumber"
            type="text"
            required
            value={companyInfos.vatNumber || ""}
            onChange={handleInputChange}
            placeholder="FR 12 123456789"
            className={inputClassName}
          />
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <label htmlFor="IBAN" className={labelClassName}>
            IBAN
          </label>
          <input
            id="IBAN"
            name="IBAN"
            type="text"
            required
            value={companyInfos.IBAN}
            onChange={handleInputChange}
            placeholder="FR76 3000 1007 9412 3456 7890 123"
            className={inputClassName}
          />
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="BIC" className={labelClassName}>
            BIC
          </label>
          <input
            id="BIC"
            name="BIC"
            type="text"
            required
            value={companyInfos.BIC}
            onChange={handleInputChange}
            placeholder="SOGEFRPP"
            className={inputClassName}
          />
        </div>
      </div>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        {onCancel && <button type="button" onClick={onCancel} className="rounded-md border border-zinc-200 px-4 py-3 text-sm font-semibold text-zinc-700">Annuler</button>}
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-md bg-primary px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? 'Enregistrement…' : companyToEdit ? 'Enregistrer les modifications' : 'Créer mon entreprise'}
        </button>
      </div>
    </form>
  )
}

export default CreateCompanyForm

function getEreportingStatusLabel(status: string) {
  return {
    PENDING: 'En attente',
    SUBMITTING: 'Transmission en cours',
    SUBMITTED: 'Transmis à SuperPDP',
    ACCEPTED: 'Accepté',
    REJECTED: 'Rejeté',
    FAILED: 'Échec de transmission',
  }[status] ?? status;
}
