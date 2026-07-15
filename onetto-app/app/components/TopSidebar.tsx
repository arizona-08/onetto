'use client';
import React from 'react'
import BurgerMenu from './molecules/BurgerMenu'
import { Building, FileChartColumnIncreasing, LayoutDashboardIcon, LogOut, SettingsIcon, UserIcon, Waypoints } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { logout } from '@/lib/auth/auth';

const links = [
  { name: 'Dashboard', href: '/dashboard', icon: <LayoutDashboardIcon />  },
  {name: 'Mon entreprise', href: '/companny', icon: <Building />},
  { name: 'Factures', href: '/invoices', icon: <FileChartColumnIncreasing />  },
  { name: 'Services', href: '/services', icon: <Waypoints /> },
  { name: 'Clients', href: '/customers', icon: <UserIcon />  },
  { name: 'Paramètres', href: '/settings/account', icon: <SettingsIcon />  },
]

const fakeCompanies = [
  { id: '1', name: 'Ma Société', email: "email@entreprise1.com" },
  { id: '2', name: 'Ma Société 2', email: "email@entreprise2.com" },
  { id: '3', name: 'Ma Société 3', email: "email@entreprise3.com" }
]

function TopSidebar() {
  const [isOpen, setIsOpen] = React.useState(false)

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
  const [showDesktopCompaniesMenu, setShowDesktopCompaniesMenu] = React.useState(false);

  return (
    <header className="bg-white relative w-full border-b border-zinc-200 shadow-xs lg:w-64 lg:h-screen p-4 lg:flex lg:flex-col">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <BurgerMenu trigger={() => setIsOpen(!isOpen)} />
          <h1 className="font-title text-2xl font-black text-primary" onClick={() => setIsOpen(true)}>ONETTO</h1>
        </div>

        <div className="relative">
          {/* profile pic */}
          <div className="w-8 h-8 bg-gray-200 rounded-full lg:hidden" onClick={() => setShowMobileCompaniesMenu(!showMobileCompaniesMenu)}></div>

          {/* mobile companies menu */}
          <div className="lg:hidden absolute right-0 top-full bg-white shadow-lg rounded-lg mt-2 w-56 z-20">
            {showMobileCompaniesMenu && (
              <div>
                <ul>
                  {fakeCompanies.map((company) => (
                    <li key={company.id} className="px-4 py-2 hover:bg-zinc-50 cursor-pointer overflow-hidden" onClick={() => setShowMobileCompaniesMenu(false)}>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                        <div>
                          <p>{company.name}</p>
                          <p className="text-xs text-zinc-500">{company.email}</p>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>

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
                  className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-colors ${isCurrentPathName ? 'bg-zinc-200 text-zinc-900' : 'text-zinc-700 hover:bg-zinc-200'}`}
                >
                  {link.icon}
                  {link.name}
                </a>
              </li>
            )})}
          </ul>
        </nav>

        <div className="hidden lg:block relative w-full hover:bg-zinc-200 p-2 rounded-lg transition-colors cursor-pointer group duration-300">
          <div
            className="absolute -top-2 left-1/2 -translate-x-1/2 -translate-y-full w-full flex justify-center items-center gap-3 rounded-md bg-white px-4 py-2 text-red-500 border border-gray-200 shadow-xs cursor-pointer opacity-0 invisible group-hover:visible group-hover:opacity-100 transition-all duration-150"
            onClick={handleLogout}
          >
            <p>Me déconnecter</p>
            <LogOut className="w-5 h-5"/>
          </div>
          <div>
            <p className="text-zinc-700">Jonathan ASSI</p>
            <span className="text-sm text-zinc-500">assijoanthan2@gmail.com</span>
          </div>
        </div>
      </div>
    </header>
  )
}

export default TopSidebar