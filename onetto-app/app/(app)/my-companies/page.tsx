'use client';

import { Company } from '@/lib/companies/dtos/create-company.dto';
import { CompanyPlanAccess, deleteCompany, getActiveCompanyPlanAccess, getMyCompanies, performOwnedCompanyAction, performUserCompanyAction, selectCompany } from '@/lib/companies/companies';
import { COMPANY_UPDATED_EVENT, notifyCompanyUpdated } from '@/lib/companies/company-events';
import { Building2, Check, ChevronDown, ChevronRight, EllipsisVertical, Eye, EyeOff, Plus, Power, RotateCcw, Trash2, TriangleAlert } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React from 'react';
import { useToast } from '@/app/components/context/ToastContext';
import { useAuthUser } from '@/app/components/context/AuthUserContext';

function MyCompanies() {
  const router = useRouter();
  const { showToast } = useToast();
  const { user } = useAuthUser();
  const [companies, setCompanies] = React.useState<Company[]>([]);
  const [activeCompanyId, setActiveCompanyId] = React.useState<string | null>(null);
  const [companyToDelete, setCompanyToDelete] = React.useState<Company | null>(null);
  const [companyToClose, setCompanyToClose] = React.useState<Company | null>(null);
  const [closingReason, setClosingReason] = React.useState('');
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [openMenuCompanyId, setOpenMenuCompanyId] = React.useState<string | null>(null);
  const [isActionPending, setIsActionPending] = React.useState(false);
  const [showHiddenCompanies, setShowHiddenCompanies] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [planAccess, setPlanAccess] = React.useState<CompanyPlanAccess | null>(null);

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
    if (response.data.activeCompanyId) {
      const accessResponse = await getActiveCompanyPlanAccess();
      if (accessResponse.ok) setPlanAccess(accessResponse.data);
    }
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

  async function handleOwnedAction(company: Company) {
    const action = 'reactivate';
    setIsActionPending(true);
    const response = await performOwnedCompanyAction(company.id, action);
    setIsActionPending(false);

    if (!response.ok) {
      showToast('Impossible de mettre à jour le statut de cette entreprise.', 'error');
      return;
    }

    setOpenMenuCompanyId(null);
    await loadCompanies();
    notifyCompanyUpdated();
    showToast('L’entreprise a été réactivée.', 'success');
    router.refresh();
  }

  async function handleClose() {
    if (!companyToClose || !closingReason.trim()) return;
    setIsActionPending(true);
    const response = await performOwnedCompanyAction(companyToClose.id, 'close', closingReason);
    setIsActionPending(false);

    if (!response.ok) {
      showToast('Impossible de fermer cette entreprise.', 'error');
      return;
    }

    setCompanyToClose(null);
    setClosingReason('');
    setOpenMenuCompanyId(null);
    await loadCompanies();
    notifyCompanyUpdated();
    showToast('L’entreprise a été fermée.', 'success');
    router.refresh();
  }

  async function handleVisibilityAction(company: Company) {
    const action = company.isHidden ? 'unhide' : 'hide';
    setIsActionPending(true);
    const response = await performUserCompanyAction(company.id, action);
    setIsActionPending(false);

    if (!response.ok) {
      showToast('Impossible de modifier la visibilité de cette entreprise.', 'error');
      return;
    }

    setOpenMenuCompanyId(null);
    await loadCompanies();
    notifyCompanyUpdated();
    showToast(action === 'hide' ? 'L’entreprise a été masquée.' : 'L’entreprise a été démasquée.', 'success');
  }

  const visibleCompanies = companies.filter((company) => !company.isHidden);
  const hiddenCompanies = companies.filter((company) => company.isHidden);
  const ownedCompaniesCount = companies.filter((company) => company.ownerId === user?.id).length;
  const canCreateCompany = !planAccess || ownedCompaniesCount < planAccess.maxOwnedCompanies;

  return (
    <div className="mx-auto w-full max-w-6xl p-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="mb-1 text-2xl font-title font-black">Mes entreprises</h1>
          <p className="text-gray-500">Choisissez l’entreprise utilisée pour vos prochaines factures.</p>
        </div>
        {companies.length > 0 && (canCreateCompany ? (
          <Link href="/my-companies/create" className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-white hover:bg-primary-hover">
            <Plus className="h-4 w-4" /> Ajouter une entreprise
          </Link>
        ) : <div title="Passer au plan PRO pour créer une entreprise supplémentaire" className="cursor-not-allowed opacity-50"><span className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-white"><Plus className="h-4 w-4" /> Ajouter une entreprise</span><p className="mt-2 max-w-56 text-xs text-zinc-500">Passer au plan PRO pour créer jusqu’à 3 entreprises.</p></div>)}
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
        <>
          <ul className="mt-8 grid gap-4 lg:grid-cols-2">
          {visibleCompanies.map((company) => {
            const isActive = company.id === activeCompanyId;
            const isOwner = company.ownerId === user?.id;
            const isMenuOpen = openMenuCompanyId === company.id;
            const isClosed = company.status === 'CLOSED';
            return (
              <li key={company.id} className={`rounded-lg border p-5 shadow-sm ${isClosed ? 'border-red-100 bg-red-50/70' : company.isHidden ? 'border-zinc-200 bg-zinc-50 opacity-60 grayscale' : 'border-zinc-200 bg-white'} ${isActive ? 'ring-1 ring-primary' : ''}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex min-w-0 gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"><Building2 className="h-5 w-5" /></div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h2 className="truncate font-title font-bold text-zinc-900">{company.name}</h2>
                        {!company.isPaymentAccountConnected && (
                          <div title="Compte de paiment GoCardless non connecté">
                            <TriangleAlert className="w-4 h-4 text-red-500"/>
                          </div>
                        ) }

                        {(company?.companyPaymentAccount && company.companyPaymentAccount.verificationStatus === 'NOT_VERIFIED') && (
                          <div title="Compte de paiment GoCardless non vérifié">
                            <TriangleAlert className="w-4 h-4 text-orange-500"/>
                          </div>
                        )}
                      </div>
                      <p className="truncate text-sm text-zinc-500">{company.email}</p>
                      <p className="mt-1 text-sm text-zinc-500">{company.city}, {company.country}</p>
                    </div>
                  </div>
                  <div className="relative flex shrink-0 items-start gap-2">
                    {isClosed && <span className="rounded-full bg-red-100 py-2 text-xs font-semibold text-red-700">Fermée</span>}
                    {isActive && <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-1 text-xs font-semibold text-primary"><Check className="h-3 w-3" /> Active</span>}
                    <button type="button" aria-label={`Actions pour ${company.name}`} aria-expanded={isMenuOpen} onClick={() => setOpenMenuCompanyId(isMenuOpen ? null : company.id)} className="rounded-md px-2 pb-2 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800">
                      <EllipsisVertical className="h-5 w-5" />
                    </button>
                    {isMenuOpen && (
                      <div className="absolute right-0 top-full z-20 mt-1 w-56 rounded-md border border-zinc-200 bg-white p-1 shadow-lg">
                        {isOwner && isClosed && (
                          <button type="button" disabled={isActionPending} onClick={() => void handleOwnedAction(company)} className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-50 disabled:opacity-50">
                            <RotateCcw className="h-4 w-4" /> Réactiver l’entreprise
                          </button>
                        )}
                        {isOwner && !isClosed && (
                          <button type="button" disabled={isActionPending} onClick={() => isClosed ? void handleOwnedAction(company) : setCompanyToClose(company)} className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-50 disabled:opacity-50">
                            {isClosed ? <RotateCcw className="h-4 w-4" /> : <Power className="h-4 w-4" />}
                            {isClosed ? 'Réactiver l’entreprise' : 'Fermer l’entreprise'}
                          </button>
                        )}
                        {!isActive && (
                          <button type="button" disabled={isActionPending} onClick={() => void handleVisibilityAction(company)} className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-50 disabled:opacity-50">
                            {company.isHidden ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                            {company.isHidden ? 'Démasquer l’entreprise' : 'Masquer l’entreprise'}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <div className="mt-5 flex flex-wrap gap-2 border-t border-zinc-100 pt-4">
                  <button onClick={() => void handleSelect(company.id)} disabled={isActive || company.isHidden} className="rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white disabled:cursor-default disabled:opacity-50">{isActive ? 'Entreprise active' : 'Utiliser cette entreprise'}</button>
                  {isOwner && <Link href={`/my-companies/${company.id}`} className="inline-flex items-center gap-1 rounded-md border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"><Eye className="h-4 w-4" /> Voir</Link>}
                  {!isClosed && isOwner && <button onClick={() => setCompanyToDelete(company)} className="inline-flex items-center gap-1 rounded-md border border-red-200 px-3 py-2 text-sm font-medium text-red-600"><Trash2 className="h-4 w-4" /> Supprimer</button>}
                </div>
              </li>
            );
          })}
          </ul>
          {hiddenCompanies.length > 0 && (
            <section className="mt-8 border-t border-zinc-200 pt-8">
              <button type="button" onClick={() => setShowHiddenCompanies((current) => !current)} className="flex w-full items-center justify-between rounded-lg border border-zinc-200 bg-white px-4 py-3 text-left text-sm font-semibold text-zinc-700 hover:bg-zinc-50">
                <span>Entreprises masquées ({hiddenCompanies.length})</span>
                {showHiddenCompanies ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </button>
              {showHiddenCompanies && (
                <ul className="mt-4 grid gap-4 lg:grid-cols-2">
                  {hiddenCompanies.map((company) => {
                    const isActive = company.id === activeCompanyId;
                    const isOwner = company.ownerId === user?.id;
                    const isMenuOpen = openMenuCompanyId === company.id;
                    const isClosed = company.status === 'CLOSED';
                    return (
                      <li key={company.id} className={`rounded-lg border p-5 shadow-sm ${isClosed ? 'border-red-100 bg-red-50/70' : 'border-zinc-200 bg-zinc-50 opacity-60 grayscale'} ${isActive ? 'ring-1 ring-primary' : ''}`}>
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex min-w-0 gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"><Building2 className="h-5 w-5" /></div><div className="min-w-0"><h2 className="truncate font-title font-bold text-zinc-900">{company.name}</h2><p className="truncate text-sm text-zinc-500">{company.email}</p><p className="mt-1 text-sm text-zinc-500">{company.city}, {company.country}</p></div></div>
                          <div className="relative flex shrink-0 items-center gap-2">
                            {isClosed && <span className="rounded-full bg-red-100 px-2 py-1 text-xs font-semibold text-red-700">Fermée</span>}
                            <button type="button" aria-label={`Actions pour ${company.name}`} aria-expanded={isMenuOpen} onClick={() => setOpenMenuCompanyId(isMenuOpen ? null : company.id)} className="rounded-md p-2 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800"><EllipsisVertical className="h-5 w-5" /></button>
                            {isMenuOpen && <div className="absolute right-0 top-full z-20 mt-1 w-56 rounded-md border border-zinc-200 bg-white p-1 shadow-lg">
                              {isOwner && isClosed && <button type="button" disabled={isActionPending} onClick={() => void handleOwnedAction(company)} className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"><RotateCcw className="h-4 w-4" /> Réactiver l’entreprise</button>}
                              {isOwner && !isClosed && <button type="button" disabled={isActionPending} onClick={() => setCompanyToClose(company)} className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"><Power className="h-4 w-4" /> Fermer l’entreprise</button>}
                              <button type="button" disabled={isActionPending} onClick={() => void handleVisibilityAction(company)} className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"><Eye className="h-4 w-4" /> Démasquer l’entreprise</button>
                            </div>}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          )}
        </>
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

      {companyToClose && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/40 p-4" role="dialog" aria-modal="true" aria-labelledby="close-company-title">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h2 id="close-company-title" className="font-title text-xl font-black text-zinc-900">Fermer cette entreprise ?</h2>
            <p className="mt-3 text-sm text-zinc-600">Les informations et documents émis seront conservés pour consultation, mais toute nouvelle activité sera bloquée.</p>
            <label htmlFor="closingReason" className="mt-5 block text-sm font-semibold text-zinc-800">Motif de fermeture</label>
            <textarea id="closingReason" value={closingReason} onChange={(event) => setClosingReason(event.target.value)} rows={4} placeholder="Ex. cessation d’activité" className="mt-2 w-full rounded-md border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-primary" />
            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button type="button" disabled={isActionPending} onClick={() => { setCompanyToClose(null); setClosingReason(''); }} className="rounded-md border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700">Annuler</button>
              <button type="button" disabled={isActionPending || !closingReason.trim()} onClick={() => void handleClose()} className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60">{isActionPending ? 'Fermeture…' : 'Confirmer la fermeture'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MyCompanies;
