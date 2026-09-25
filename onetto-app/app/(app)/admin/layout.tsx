import Link from 'next/link';
import type { ReactNode } from 'react';

const links = [
  ['Vue d’ensemble', '/admin'], ['Utilisateurs', '/admin/users'], ['Entreprises', '/admin/companies'],
  ['Prestations', '/admin/services'], ['Abonnements', '/admin/subscriptions'], ['Paiements', '/admin/payments'], ['Système', '/admin/system'],
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <div className="min-h-full bg-zinc-50 p-4 sm:p-6 lg:p-8"><header className="mx-auto flex max-w-7xl flex-col gap-4 border-b border-primary/20 pb-5 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-bold tracking-[0.18em] text-primary">ONETTO · INTERNE</p><h1 className="font-title text-2xl font-semibold text-zinc-900">Administration</h1></div><nav className="flex flex-wrap gap-2">{links.map(([label, href]) => <Link key={href} href={href} className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-600 hover:bg-white hover:text-primary">{label}</Link>)}</nav></header><main className="mx-auto max-w-7xl py-6">{children}</main></div>;
}
