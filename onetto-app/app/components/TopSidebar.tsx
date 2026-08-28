'use client';
import React from 'react'
import BurgerMenu from './molecules/BurgerMenu'
import { Building, FileChartColumnIncreasing, LayoutDashboardIcon, LogOut, SettingsIcon, UserIcon, Waypoints } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { logout } from '@/lib/auth/auth';
import { getMyCompanies, selectCompany } from '@/lib/companies/companies';
import { Company } from '@/lib/companies/dtos/create-company.dto';
import Link from 'next/link';
import { useAuthUser } from './context/AuthUserContext';
import { COMPANY_UPDATED_EVENT, notifyCompanyUpdated } from '@/lib/companies/company-events';

const links = [
  { name: 'Dashboard', href: '/dashboard', icon: <LayoutDashboardIcon />  },
  { name: 'Devis & Factures', href: '/documents', icon: <FileChartColumnIncreasing />  },
  { name: 'Mes entreprises', href: '/my-companies', icon: <Building />},
  { name: 'Mes Clients', href: '/customers', icon: <UserIcon />  },
  { name: 'Mes Services', href: '/services', icon: <Waypoints /> },
  { name: 'Paramètres', href: '/settings/account', icon: <SettingsIcon />  },
]

function TopSidebar() {
  const [isOpen, setIsOpen] = React.useState(false)
  const { user } = useAuthUser();

  const pathname = usePathname();
  const router = useRouter();
  
  async function handleLogout(){
    const response = await logout();

    if(!response.ok) {
      console.error('Failed to logout');
    }

    router.push("/auth/login")
  }

  const [showMobileCompaniesMenu, setShowMobileCompaniesMenu] = React.useState(false);
  const [companies, setCompanies] = React.useState<Company[]>([]);
  const [activeCompanyId, setActiveCompanyId] = React.useState<string | null>(null);

  const loadCompanies = React.useCallback(async () => {
    const response = await getMyCompanies();
    if (response.ok) {
      setCompanies(response.data.companies);
      setActiveCompanyId(response.data.activeCompanyId);
    }
  }, []);

  React.useEffect(() => {
    void loadCompanies();
    window.addEventListener(COMPANY_UPDATED_EVENT, loadCompanies);
    return () => window.removeEventListener(COMPANY_UPDATED_EVENT, loadCompanies);
  }, [loadCompanies, pathname]);

  const activeCompany = companies.find((company) => company.id === activeCompanyId);
  const otherCompanies = companies.filter((company) => company.id !== activeCompanyId && !company.isHidden);

  function getInitials(name: string) {
    return name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toUpperCase();
  }

  async function handleCompanySelection(companyId: string) {
    const response = await selectCompany(companyId);
    if (!response.ok) {
      console.error('Failed to select company');
      return;
    }

    setActiveCompanyId(companyId);
    setShowMobileCompaniesMenu(false);
    notifyCompanyUpdated();
    router.refresh();
  }

  return (
    <header className="bg-white relative w-full border-b border-zinc-200 lg:w-64 lg:h-screen p-4 lg:flex lg:flex-col">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <BurgerMenu trigger={() => setIsOpen(!isOpen)} />
          <h1 className="font-title text-2xl font-bold text-primary" onClick={() => setIsOpen(true)}>ONETTO</h1>
        </div>

        <div className="relative">
          {/* profile pic */}
          <button type="button" aria-label="Ouvrir le menu du compte" className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary lg:hidden" onClick={() => setShowMobileCompaniesMenu(!showMobileCompaniesMenu)}>
            {activeCompany ? getInitials(activeCompany.name) : 'O'}
          </button>

          {/* mobile companies menu */}
          <div className="lg:hidden absolute right-0 top-full z-20 mt-2 w-56 rounded-lg bg-white">
            {showMobileCompaniesMenu && (
              <div>
                <div className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">{activeCompany ? getInitials(activeCompany.name) : 'O'}</div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-zinc-800">{activeCompany?.name ?? 'Aucune entreprise sélectionnée'}</p>
                      <p className="truncate text-xs text-zinc-500">{activeCompany?.email ?? 'Gérer mes entreprises'}</p>
                    </div>
                  </div>
                  <hr className="my-3 border-zinc-200" />
                  <p className="truncate text-sm font-medium text-zinc-800">{user ? `${user.firstname} ${user.lastname}` : 'Chargement du compte…'}</p>
                  <p className="truncate text-xs text-zinc-500">{user?.email ?? ''}</p>
                </div>
                <hr className="border-zinc-200" />
                <ul>
                  {otherCompanies.map((company) => (
                    <li key={company.id} className="cursor-pointer overflow-hidden px-4 py-2 hover:bg-zinc-50" onClick={() => void handleCompanySelection(company.id)}>
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">{getInitials(company.name)}</div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate">{company.name}</p>
                          <p className="truncate text-xs text-zinc-500">{company.email}</p>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>

                <Link href="/my-companies" className="mx-4 mt-3 block rounded-md border border-zinc-200 px-3 py-2 text-center text-sm font-medium text-zinc-700" onClick={() => setShowMobileCompaniesMenu(false)}>Gérer mes entreprises</Link>

                <hr className="my-3 block text-zinc-200 w-full max-w-35 mx-auto" />

                <div className="flex items-center justify-center mb-4 cursor-pointer" onClick={handleLogout}>
                  <p className="text-sm text-red-500 flex items-center gap-3">Se déconnecter <LogOut className="w-4 h-4"/></p>
                </div>
                
              </div>

            )}
          </div>
        </div>
      </div>

      <div className={`bg-white border-b border-zinc-200 absolute left-0 top-full z-10 w-full h-0 overflow-hidden ${isOpen ? 'h-90' : ''} lg:h-full lg:relative lg:top-0 lg:border-b-0 lg:flex-1 lg:flex lg:flex-col lg:justify-between transition-all duration-150`}>
        <nav className="mt-4">
          <ul className="px-2 lg:px-0">
            {links.map((link) => {
              const currentPathNameCategory = pathname.split('/')[1];
              const linkPathNameCategory = link.href.split('/')[1];
              const isCurrentPathName = currentPathNameCategory === linkPathNameCategory;
              return (
              <li key={link.name} className="mb-2">
                <a
                  href={link.href}
                  className={`flex items-center gap-3 px-4 py-2 rounded-lg font-normal transition-colors ${isCurrentPathName ? 'bg-zinc-200 text-zinc-900 font-medium' : 'text-zinc-600 hover:bg-zinc-200'}`}
                >
                  {link.icon}
                  {link.name}
                </a>
              </li>
            )})}
          </ul>
        </nav>

        <div className="hidden lg:block relative w-full rounded-lg p-2 transition-colors hover:bg-zinc-100 group duration-300">
          <div className="absolute -top-2 left-1/2 -translate-x-1/2 -translate-y-full w-full opacity-0 invisible group-hover:visible group-hover:opacity-100 transition-all duration-150 space-y-2">
            <ul className="bg-white border border-zinc-200 rounded-lg">
              {otherCompanies.map((company) => (
                <li key={company.id} className="cursor-pointer overflow-hidden px-2 py-2 hover:bg-zinc-50" onClick={() => void handleCompanySelection(company.id)}>
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">{getInitials(company.name)}</div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{company.name}</p>
                      <p className="truncate text-xs text-zinc-500">{company.email}</p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <div className="space-y-3 cursor-pointer">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                {activeCompany ? getInitials(activeCompany.name) : 'O'}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-zinc-800">{activeCompany?.name ?? 'Aucune entreprise sélectionnée'}</p>
                <p className="truncate text-xs text-zinc-500">{activeCompany?.email ?? 'Gérer mes entreprises'}</p>
              </div>
            </div>

            <hr className="border-zinc-200" />

            <div className="flex items-center justify-between gap-3 px-1">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-zinc-800">{user ? `${user.firstname} ${user.lastname}` : 'Chargement du compte…'}</p>
                <p className="truncate text-xs text-zinc-500">{user?.email ?? ''}</p>
              </div>
              <button type="button" aria-label="Se déconnecter" title="Se déconnecter" onClick={() => void handleLogout()} className="shrink-0 rounded-md p-2 text-zinc-500 transition-colors hover:bg-red-50 hover:text-red-600">
                <LogOut className="h-4 w-4 text-red-500" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}

export default TopSidebar
