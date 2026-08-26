'use client';

import { useAuthUser } from '@/app/components/context/AuthUserContext';
import { useToast } from '@/app/components/context/ToastContext';
import { updateMyProfile } from '@/lib/users/profile';
import { Mail, UserRound } from 'lucide-react';
import { FormEvent, useEffect, useState } from 'react';

export default function AccountPage() {
  const { user, setUser } = useAuthUser();
  const { showToast } = useToast();
  const [profile, setProfile] = useState({ firstname: '', lastname: '', email: '' });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) setProfile({ firstname: user.firstname, lastname: user.lastname, email: user.email });
  }, [user]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null); setIsSaving(true);
    const response = await updateMyProfile(profile);
    setIsSaving(false);
    if (!response.ok) {
      setError(typeof response.error.message === 'string' ? response.error.message : 'Impossible de mettre à jour votre profil.');
      return;
    }
    const { user: updatedUser } = response.data;
    setUser({ id: updatedUser.id, firstname: updatedUser.firstname, lastname: updatedUser.lastname, email: updatedUser.email, role: updatedUser.accountType });
    showToast('Profil mis à jour.', 'success');
  }

  return <main className="mx-auto w-full max-w-3xl p-4 sm:p-6">
    <header className="mb-6"><p className="text-sm font-medium text-primary">Paramètres</p><h1 className="mt-1 font-title text-2xl font-black text-zinc-900">Mon profil</h1><p className="mt-2 text-sm text-zinc-600">Gérez les informations associées à votre compte Onetto.</p></header>
    <form onSubmit={handleSubmit} className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex items-start gap-3 border-b border-zinc-100 pb-5"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><UserRound className="h-5 w-5" /></div><div><h2 className="font-semibold text-zinc-900">Informations personnelles</h2><p className="mt-1 text-sm text-zinc-500">Ces informations servent à identifier votre compte.</p></div></div>
      {error && <p role="alert" className="mt-5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <div className="mt-6 grid gap-5 sm:grid-cols-2"><Field label="Prénom" value={profile.firstname} onChange={(firstname) => setProfile((current) => ({ ...current, firstname }))} /><Field label="Nom" value={profile.lastname} onChange={(lastname) => setProfile((current) => ({ ...current, lastname }))} /></div>
      <label className="mt-5 block text-sm font-medium text-zinc-800">Adresse e-mail<div className="relative mt-2"><Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" /><input required type="email" value={profile.email} onChange={(event) => setProfile((current) => ({ ...current, email: event.target.value }))} className="w-full rounded-lg border border-zinc-300 py-2.5 pl-10 pr-3 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10" /></div></label>
      <div className="mt-6 flex justify-end border-t border-zinc-100 pt-5"><button type="submit" disabled={isSaving || !user} className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50">{isSaving ? 'Enregistrement…' : 'Enregistrer les modifications'}</button></div>
    </form>
  </main>;
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="block text-sm font-medium text-zinc-800">{label}<input required value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 w-full rounded-lg border border-zinc-300 px-3 py-2.5 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10" /></label>;
}
