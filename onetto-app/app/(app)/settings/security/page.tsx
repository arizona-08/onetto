'use client';

import { useToast } from '@/app/components/context/ToastContext';
import { changeMyPassword } from '@/lib/users/profile';
import { KeyRound, ShieldCheck } from 'lucide-react';
import { FormEvent, useState } from 'react';

export default function SecurityPage() {
  const { showToast } = useToast();
  const [values, setValues] = useState({ currentPassword: '', newPassword: '', confirmationPassword: '' });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(null); setIsSaving(true);
    const response = await changeMyPassword(values); setIsSaving(false);
    if (!response.ok) { setError(typeof response.error.message === 'string' ? response.error.message : 'Impossible de mettre à jour le mot de passe.'); return; }
    setValues({ currentPassword: '', newPassword: '', confirmationPassword: '' }); showToast('Mot de passe mis à jour.', 'success');
  }
  return <main className="mx-auto w-full max-w-3xl p-4 sm:p-6">
    <header className="mb-6"><p className="text-sm font-medium text-primary">Paramètres</p><h1 className="mt-1 font-title text-2xl font-black text-zinc-900">Sécurité et confidentialité</h1><p className="mt-2 text-sm text-zinc-600">Protégez l’accès à votre compte.</p></header>
    <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6"><div className="flex items-start gap-3 border-b border-zinc-100 pb-5"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><KeyRound className="h-5 w-5" /></div><div><h2 className="font-semibold text-zinc-900">Modifier le mot de passe</h2><p className="mt-1 text-sm text-zinc-500">Choisissez un mot de passe d’au moins 8 caractères.</p></div></div>
      {error && <p role="alert" className="mt-5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <form onSubmit={handleSubmit} className="mt-6 space-y-5"><PasswordField label="Mot de passe actuel" autoComplete="current-password" value={values.currentPassword} onChange={(currentPassword) => setValues((current) => ({ ...current, currentPassword }))} /><PasswordField label="Nouveau mot de passe" autoComplete="new-password" value={values.newPassword} onChange={(newPassword) => setValues((current) => ({ ...current, newPassword }))} /><PasswordField label="Confirmer le nouveau mot de passe" autoComplete="new-password" value={values.confirmationPassword} onChange={(confirmationPassword) => setValues((current) => ({ ...current, confirmationPassword }))} /><div className="flex justify-end border-t border-zinc-100 pt-5"><button type="submit" disabled={isSaving} className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50">{isSaving ? 'Mise à jour…' : 'Mettre à jour le mot de passe'}</button></div></form>
    </section>
    <aside className="mt-4 flex gap-3 rounded-xl border border-primary/15 bg-primary/[0.04] p-4 text-sm text-zinc-700"><ShieldCheck className="h-5 w-5 shrink-0 text-primary" /><p>Votre mot de passe est chiffré avant d’être enregistré. Ne le partagez jamais avec un tiers.</p></aside>
  </main>;
}

function PasswordField({ label, autoComplete, value, onChange }: { label: string; autoComplete: string; value: string; onChange: (value: string) => void }) {
  return <label className="block text-sm font-medium text-zinc-800">{label}<input required minLength={8} type="password" autoComplete={autoComplete} value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 w-full rounded-lg border border-zinc-300 px-3 py-2.5 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10" /></label>;
}
