'use client';

import { CreateCompanyDto } from '@/lib/companies/dtos/create-company.dto';
import { Company } from '@/lib/companies/dtos/create-company.dto';
import { createCompany, updateCompany } from '@/lib/companies/companies';
import { useRouter } from 'next/navigation';
import { notifyCompanyUpdated } from '@/lib/companies/company-events';
import { useToast } from '../../context/ToastContext';
import React, { useState } from 'react'

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
    vatNumber: "",
    IBAN: "",
  BIC: ""
};

function CreateCompanyForm({ companyToEdit, onSuccess, onCancel }: CreateCompanyFormProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [companyInfos, setCompanyInfos] = useState<CreateCompanyDto>(companyToEdit ?? emptyCompany);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inputClassName = "rounded-md border border-zinc-200 bg-custom-gray-light px-4 py-3 text-sm text-zinc-800 outline-none transition-colors focus:border-primary focus:bg-white";
  const labelClassName = "font-title text-xs font-semibold uppercase tracking-wide text-zinc-600";

  function handleInputChange(event: React.ChangeEvent<HTMLInputElement>) {
    const { name, value, type, checked } = event.target;
    const fieldName = name as keyof CreateCompanyDto;

    setCompanyInfos(prevState => {
      if (fieldName === 'subjectToVat') {
        return {
          ...prevState,
          subjectToVat: checked,
          vatNumber: checked ? prevState.vatNumber : "",
        };
      }

      return {
        ...prevState,
        [fieldName]: type === 'checkbox' ? checked : value,
      };
    });
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    if (companyToEdit) {
      const response = await updateCompany(companyToEdit.id, companyInfos);
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

    const response = await createCompany(companyInfos);
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

  return (
    <form className="space-y-5 p-6 bg-white rounded-md" onSubmit={handleSubmit}>
      <h2 className="text-lg font-bold text-zinc-800">Renseignez les informations de votre entreprise</h2>

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
