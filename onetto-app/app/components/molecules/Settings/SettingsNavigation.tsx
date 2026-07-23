'use client'
import { usePathname } from 'next/navigation';
import React from 'react'

const settingsLinks = [
  { name: 'Mon profil', href: '/settings/account' },
  { name: 'Sécurité et confidentialité', href: '/settings/security' },
  { name: 'Mon abonnement', href: '/settings/my-subscription' },
]
function SettingsNavigation() {
  const pathname = usePathname();

  return (
    <div className="bg-white pt-4 px-4">
      <h2 className="text-xl font-title font-semibold mb-2">Paramètres</h2>
      <nav className="overflow-x-auto w-full max-w-250 mt-12">
        <ul className="flex gap-6">
          {settingsLinks.map((link) => {
            const isCurrentPathName = link.href.startsWith(pathname);
            return (
            <li key={link.href} className="whitespace-nowrap pb-4">
              <a href={link.href} className={`inline-block text-gray-400 font-semibold hover:text-primary relative after:absolute after:-bottom-4 after:left-0 after:w-full after:h-1 after:rounded-t-sm after:bg-primary hover:after:block ${isCurrentPathName ? 'text-primary after:block' : 'after:hidden'}`}>
                {link.name}
              </a>
            </li>
          )
          })}
        </ul>
      </nav>
    </div>
  )
}

export default SettingsNavigation