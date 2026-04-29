'use client';
import React from 'react'
import BurgerMenu from './BurgerMenu'
import { FileChartColumnIncreasing, LayoutDashboardIcon, SettingsIcon, UserIcon, Waypoints } from 'lucide-react';
import { usePathname } from 'next/navigation';

const links = [
  { name: 'Dashboard', href: '/dashboard', icon: <LayoutDashboardIcon />  },
  { name: 'Services', href: '/services', icon: <Waypoints /> },
  { name: 'Factures', href: '/invoices', icon: <FileChartColumnIncreasing />  },
  { name: 'Clients', href: '/customers', icon: <UserIcon />  },
  { name: 'Paramètres', href: '/settings', icon: <SettingsIcon />  },
]

function TopSidebar() {
  const [isOpen, setIsOpen] = React.useState(false)

  const pathname = usePathname();
  
  return (
    <header className="relative w-full border-b border-zinc-200 lg:w-64 lg:h-screen bg-background p-4 lg:flex lg:flex-col lg:bg-[#EEEEEE]">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <BurgerMenu trigger={() => setIsOpen(!isOpen)} />
          <h1 className="font-title text-2xl font-black text-primary" onClick={() => setIsOpen(true)}>ONETTO</h1>
        </div>

        {/* profile pic */}
        <div className="w-8 h-8 bg-gray-200 rounded-full lg:hidden"></div>
      </div>

      <div className={`bg-background border-b border-zinc-200 absolute left-0 top-full w-full h-0 overflow-hidden ${isOpen ? 'h-90' : ''} lg:h-full lg:relative lg:top-0 lg:border-b-0 lg:flex-1 lg:flex lg:flex-col lg:justify-between lg:bg-[#EEEEEE] transition-all duration-150`}>
        <nav className="mt-4">
          <ul className="px-2 lg:px-0">
            {links.map((link) => {
              
              const isCurrentPathName = link.href.startsWith(pathname);
              return (
              <li key={link.name} className="mb-2">
                <a
                  href={link.href}
                  className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-colors ${isCurrentPathName ? 'bg-zinc-300 text-zinc-900' : 'text-zinc-700 hover:bg-zinc-300'}`}
                >
                  {link.icon}
                  {link.name}
                </a>
              </li>
            )})}
          </ul>
        </nav>

        <div className="hidden lg:block w-full hover:bg-zinc-300 p-2 rounded-lg transition-colors cursor-pointer">
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