'use client';

import type { InvoiceStats } from '@/lib/documents/document.server';
import { AlertTriangle, CheckCircle2, ChevronDown, Clock3, FileText, type LucideIcon } from 'lucide-react';
import { useState } from 'react';

type Tone = 'paid' | 'pending' | 'overdue' | 'draft';

const cards: Array<{ label: string; stat: keyof InvoiceStats; icon: LucideIcon; tone: Tone }> = [
  { label: 'Payées', stat: 'paid', icon: CheckCircle2, tone: 'paid' },
  { label: 'En attente', stat: 'pending', icon: Clock3, tone: 'pending' },
  { label: 'En retard', stat: 'overdue', icon: AlertTriangle, tone: 'overdue' },
  { label: 'Brouillons', stat: 'draft', icon: FileText, tone: 'draft' },
];

const toneClass: Record<Tone, string> = {
  paid: 'bg-emerald-50 text-emerald-600',
  pending: 'bg-amber-50 text-amber-600',
  overdue: 'bg-red-50 text-red-600',
  draft: 'bg-zinc-100 text-zinc-600',
};

export default function InvoiceStatsOverview({ stats }: { stats: InvoiceStats }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <section className="mt-8" aria-label="Résumé des factures">
      <button type="button" onClick={() => setIsOpen((open) => !open)} className="flex min-h-12 w-full items-center justify-between rounded-xl border border-zinc-200 bg-white px-4 text-left text-sm font-semibold text-zinc-800 sm:hidden" aria-expanded={isOpen} aria-controls="invoice-stats">
        Résumé des factures
        <ChevronDown className={`h-5 w-5 text-zinc-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>
      <div id="invoice-stats" className={`${isOpen ? 'grid' : 'hidden'} mt-3 grid-cols-1 gap-4 sm:mt-0 sm:grid sm:grid-cols-2 xl:grid-cols-4`}>
        {cards.map(({ label, stat, icon: Icon, tone }) => {
          const value = stats[stat];
          return (
            <article key={stat} className="rounded-2xl border border-zinc-200 bg-white p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-zinc-500">{label}</p>
                  <p className="mt-2 font-title text-3xl font-semibold text-zinc-900">{value.totalAmount.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</p>
                </div>
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${toneClass[tone]}`}><Icon className="h-5 w-5" aria-hidden="true" /></span>
              </div>
              <p className="mt-5 text-sm text-zinc-500">{value.count} {value.count > 1 ? 'factures' : 'facture'}</p>
            </article>
          );
        })}
      </div>
    </section>
  );
}
