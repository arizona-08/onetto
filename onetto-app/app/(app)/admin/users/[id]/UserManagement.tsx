"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/app/components/context/ToastContext";
import { apiClient } from "@/lib/api";

type ManagedUser = {
  id: string;
  firstname: string;
  lastname: string;
  bannedAt: string | null;
  isAdmin: boolean;
};

export default function UserManagement({ user }: { user: ManagedUser }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [profile, setProfile] = useState({
    firstname: user.firstname,
    lastname: user.lastname,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isChangingBan, setIsChangingBan] = useState(false);
  const [bannedAt, setBannedAt] = useState(user.bannedAt);
  const [error, setError] = useState<string | null>(null);

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSaving(true);
    const result = await apiClient(`api/admin/users/${user.id}`, {
      method: "PATCH",
      body: JSON.stringify(profile),
    });
    setIsSaving(false);

    if (!result.ok) {
      const message = Array.isArray(result.error.message)
        ? result.error.message.join(" ")
        : result.error.message;
      setError(message);
      return;
    }

    showToast("Informations enregistrées.", "success");
    router.refresh();
  }

  async function changeBanState() {
    const shouldBan = !bannedAt;
    const confirmation = shouldBan
      ? "Bannir cet utilisateur ? Il ne pourra plus se connecter ni utiliser ses sessions actives."
      : "Débannir cet utilisateur ? Il pourra de nouveau se connecter.";
    if (!window.confirm(confirmation)) {
      return;
    }

    setIsChangingBan(true);
    const result = await apiClient<{ bannedAt: string | null }>(
      `api/admin/users/${user.id}/ban`,
      { method: shouldBan ? "PATCH" : "DELETE" },
    );
    setIsChangingBan(false);

    if (!result.ok) {
      const message = Array.isArray(result.error.message)
        ? result.error.message.join(" ")
        : result.error.message;
      showToast(message, "error");
      return;
    }

    setBannedAt(result.data.bannedAt);
    showToast(
      shouldBan ? "Utilisateur banni." : "Utilisateur débanni.",
      "success",
    );
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <form
        onSubmit={saveProfile}
        className="rounded-2xl border border-zinc-200 bg-white p-5"
      >
        <h3 className="font-semibold">Informations personnelles</h3>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-medium text-zinc-800">
            Prénom
            <input
              required
              maxLength={100}
              value={profile.firstname}
              onChange={(event) =>
                setProfile((current) => ({
                  ...current,
                  firstname: event.target.value,
                }))
              }
              className="mt-2 w-full rounded-lg border border-zinc-300 px-3 py-2.5 outline-none focus:border-primary"
            />
          </label>
          <label className="text-sm font-medium text-zinc-800">
            Nom
            <input
              required
              maxLength={100}
              value={profile.lastname}
              onChange={(event) =>
                setProfile((current) => ({
                  ...current,
                  lastname: event.target.value,
                }))
              }
              className="mt-2 w-full rounded-lg border border-zinc-300 px-3 py-2.5 outline-none focus:border-primary"
            />
          </label>
        </div>
        {error && (
          <p role="alert" className="mt-4 text-sm text-red-700">
            {error}
          </p>
        )}
        <div className="mt-5 flex justify-end">
          <button
            type="submit"
            disabled={isSaving}
            className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            {isSaving ? "Enregistrement…" : "Enregistrer les modifications"}
          </button>
        </div>
      </form>
      {!user.isAdmin && (
        <section className="rounded-2xl border border-zinc-200 bg-white p-5">
          <h3 className="font-semibold">Accès au compte</h3>
          <p className="mt-2 text-sm text-zinc-600">
            {bannedAt
              ? "Ce compte est banni et ne peut plus accéder à Onetto."
              : "Ce compte peut accéder à Onetto."}
          </p>
          <button
            type="button"
            onClick={changeBanState}
            disabled={isChangingBan}
            className="mt-4 rounded-lg border border-red-300 px-4 py-2.5 text-sm font-semibold text-red-700 disabled:opacity-50"
          >
            {isChangingBan
              ? "Mise à jour…"
              : bannedAt
                ? "Débannir l'utilisateur"
                : "Bannir l'utilisateur"}
          </button>
        </section>
      )}
    </div>
  );
}
