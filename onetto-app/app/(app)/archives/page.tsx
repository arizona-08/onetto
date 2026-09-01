'use client';
import { Archive, Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { getMyCompanies } from '@/lib/companies/companies';
import { ArchiveItem, getArchives } from '@/lib/archives';

export default function ArchivesPage() {
  const [companyId, setCompanyId] = useState<string | null>(null); const [items, setItems] = useState<ArchiveItem[]>([]); const [query, setQuery] = useState('');
  useEffect(() => { void getMyCompanies().then((r) => { const id = r.ok ? r.data.activeCompanyId : null; setCompanyId(id); if (id) void getArchives(id).then((a) => a.ok && setItems(a.data)); }); }, []);
  useEffect(() => { if (!companyId) return; const timer = window.setTimeout(() => void getArchives(companyId, query).then((r) => r.ok && setItems(r.data)), 250); return () => window.clearTimeout(timer); }, [companyId, query]);
  return <main className="mx-auto w-full max-w-5xl p-5 sm:p-8"><h1 className="font-title text-2xl font-semibold text-zinc-900">Archives</h1><p className="mt-1 text-sm text-zinc-500">Documents conservés de manière sécurisée et vérifiable.</p><label className="mt-6 flex max-w-md items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3"><Search className="h-4 w-4 text-zinc-400" /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Facture, client ou fournisseur" className="w-full py-2.5 text-sm outline-none" /></label><div className="mt-5 overflow-hidden rounded-xl border border-zinc-200 bg-white"><table className="w-full text-left text-sm"><thead className="bg-zinc-50 text-zinc-500"><tr><th className="p-3">Type</th><th className="p-3">Document</th><th className="p-3">Tiers</th><th className="p-3">Archivé le</th></tr></thead><tbody>{items.map((item) => <tr key={`${item.kind}-${item.id}`} className="border-t border-zinc-100"><td className="p-3">{item.kind === 'ISSUED_FACTUR_X' ? 'Factur-X émis' : 'Facture fournisseur'}</td><td className="p-3 font-medium">{item.number ?? '—'}</td><td className="p-3">{item.name ?? '—'}</td><td className="p-3">{item.archivedAt ? new Date(item.archivedAt).toLocaleString('fr-FR') : '—'}</td></tr>)}</tbody></table>{!items.length && <div className="flex flex-col items-center gap-2 p-10 text-sm text-zinc-500"><Archive className="h-5 w-5" />Aucune archive trouvée.</div>}</div></main>;
}
