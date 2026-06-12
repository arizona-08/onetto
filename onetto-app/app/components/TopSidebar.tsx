'use client';
import React from 'react'
import BurgerMenu from './molecules/BurgerMenu'
import { FileChartColumnIncreasing, LayoutDashboardIcon, SettingsIcon, UserIcon, Waypoints } from 'lucide-react';
import { usePathname } from 'next/navigation';

const links = [
  { name: 'Dashboard', href: '/dashboard', icon: <LayoutDashboardIcon />  },
  { name: 'Factures', href: '/invoices', icon: <FileChartColumnIncreasing />  },
  { name: 'Services', href: '/services', icon: <Waypoints /> },
  { name: 'Clients', href: '/customers', icon: <UserIcon />  },
  { name: 'Paramètres', href: '/settings/account', icon: <SettingsIcon />  },
]

function TopSidebar() {
  const [isOpen, setIsOpen] = React.useState(false)

  const pathname = usePathname();
  
  return (
    <header className="bg-white relative w-full border-b border-zinc-200 shadow-xs lg:w-64 lg:h-screen p-4 lg:flex lg:flex-col">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <BurgerMenu trigger={() => setIsOpen(!isOpen)} />
          <h1 className="font-title text-2xl font-black text-primary" onClick={() => setIsOpen(true)}>ONETTO</h1>
        </div>

        {/* profile pic */}
        <div className="w-8 h-8 bg-gray-200 rounded-full lg:hidden"></div>
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

        <div className="hidden lg:block w-full hover:bg-zinc-200 p-2 rounded-lg transition-colors cursor-pointer">
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