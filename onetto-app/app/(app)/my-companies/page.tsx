'use client';

import { Company } from '@/lib/companies/dtos/create-company.dto';
import { deleteCompany, getMyCompanies, selectCompany } from '@/lib/companies/companies';
import { COMPANY_UPDATED_EVENT, notifyCompanyUpdated } from '@/lib/companies/company-events';
import { Building2, Check, Pencil, Plus, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React from 'react';
import { useToast } from '@/app/components/context/ToastContext';

function MyCompanies() {
  const router = useRouter();
  const { showToast } = useToast();
  const [companies, setCompanies] = React.useState<Company[]>([]);
  const [activeCompanyId, setActiveCompanyId] = React.useState<string | null>(null);
  const [companyToDelete, setCompanyToDelete] = React.useState<Company | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  const loadCompanies = React.useCallback(async () => {
    setIsLoading(true);
    const response = await getMyCompanies();
    setIsLoading(false);

    if (!response.ok) {
      setError('Impossible de charger vos entreprises.');
      return;
    }

    setCompanies(response.data.companies);
    setActiveCompanyId(response.data.activeCompanyId);
  }, []);

  React.useEffect(() => {
    void loadCompanies();
    window.addEventListener(COMPANY_UPDATED_EVENT, loadCompanies);
    return () => window.removeEventListener(COMPANY_UPDATED_EVENT, loadCompanies);
  }, [loadCompanies]);

  async function handleSelect(companyId: string) {
    const response = await selectCompany(companyId);
    if (!response.ok) {
      setError('Impossible de sélectionner cette entreprise.');
      showToast('Impossible de sélectionner cette entreprise.', 'error');
      return;
    }

    setActiveCompanyId(companyId);
    notifyCompanyUpdated();
    showToast('L’entreprise active a été mise à jour.', 'success');
    router.refresh();
  }

  async function handleDelete() {
    if (!companyToDelete) return;
    setIsDeleting(true);
    const response = await deleteCompany(companyToDelete.id);
    setIsDeleting(false);
    if (!response.ok) {
      const message = typeof response.error.message === 'string' ? response.error.message : 'Impossible de supprimer cette entreprise.';
      setError(message);
      showToast(message, 'error');
      return;
    }

    setCompanyToDelete(null);
    await loadCompanies();
    notifyCompanyUpdated();
    showToast('L’entreprise a été supprimée.', 'success');
    router.refresh();
  }

  return (
    <div className="w-full p-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="mb-1 text-2xl font-title font-black">Mes entreprises</h1>
          <p className="text-gray-500">Choisissez l’entreprise utilisée pour vos prochaines factures.</p>
        </div>
        {companies.length > 0 && (
          <Link href="/my-companies/create" className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-white hover:bg-primary-hover">
            <Plus className="h-4 w-4" /> Ajouter une entreprise
          </Link>
        )}
      </div>

      {error && <p role="alert" className="mt-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>}

      {isLoading ? (
        <p className="mt-8 text-sm text-zinc-500">Chargement des entreprises…</p>
      ) : companies.length === 0 ? (
        <div className="mt-8 rounded-lg border border-dashed border-zinc-300 bg-white p-10 text-center">
          <Building2 className="mx-auto h-10 w-10 text-zinc-400" />
          <h2 className="mt-4 font-title text-lg font-bold">Aucune entreprise</h2>
          <p className="mt-1 text-sm text-zinc-500">Créez votre première entreprise pour pouvoir établir des factures.</p>
          <Link href="/my-companies/create" className="mt-5 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-white hover:bg-primary-hover">
            <Plus className="h-4 w-4" /> Ajouter une entreprise
          </Link>
        </div>
      ) : (
        <ul className="mt-8 grid gap-4 lg:grid-cols-2">
          {companies.map((company) => {
            const isActive = company.id === activeCompanyId;
            return (
              <li key={company.id} className={`rounded-lg border bg-white p-5 shadow-sm ${isActive ? 'border-primary ring-1 ring-primary' : 'border-zinc-200'}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex min-w-0 gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"><Building2 className="h-5 w-5" /></div>
                    <div className="min-w-0">
                      <h2 className="truncate font-title font-bold text-zinc-900">{company.name}</h2>
                      <p className="truncate text-sm text-zinc-500">{company.email}</p>
                      <p className="mt-1 text-sm text-zinc-500">{company.city}, {company.country}</p>
                    </div>
                  </div>
                  {isActive && <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-primary/10 px-2 py-1 text-xs font-semibold text-primary"><Check className="h-3 w-3" /> Active</span>}
                </div>
                <div className="mt-5 flex flex-wrap gap-2 border-t border-zinc-100 pt-4">
                  <button onClick={() => void handleSelect(company.id)} disabled={isActive} className="rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white disabled:cursor-default disabled:opacity-50">{isActive ? 'Entreprise active' : 'Utiliser cette entreprise'}</button>
                  <Link href={`/my-companies/${company.id}`} className="inline-flex items-center gap-1 rounded-md border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-700"><Pencil className="h-4 w-4" /> Modifier</Link>
                  <button onClick={() => setCompanyToDelete(company)} className="inline-flex items-center gap-1 rounded-md border border-red-200 px-3 py-2 text-sm font-medium text-red-600"><Trash2 className="h-4 w-4" /> Supprimer</button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {companyToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/40 p-4" role="dialog" aria-modal="true" aria-labelledby="delete-company-title">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h2 id="delete-company-title" className="font-title text-xl font-black text-zinc-900">Supprimer cette entreprise ?</h2>
            <p className="mt-3 text-sm text-zinc-600">Vous allez supprimer « {companyToDelete.name} ». Cette action est irréversible. Les entreprises ayant déjà des factures ne peuvent pas être supprimées.</p>
            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button type="button" disabled={isDeleting} onClick={() => setCompanyToDelete(null)} className="rounded-md border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700">Annuler</button>
              <button type="button" disabled={isDeleting} onClick={() => void handleDelete()} className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60">{isDeleting ? 'Suppression…' : 'Supprimer définitivement'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MyCompanies;
