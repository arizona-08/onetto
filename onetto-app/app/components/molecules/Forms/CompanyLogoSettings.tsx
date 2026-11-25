"use client";

import { useRef, useState } from "react";
import CompanyLogo from "../CompanyLogo";
import { removeCompanyLogo, uploadCompanyLogo } from "@/lib/companies/companies";
import { notifyCompanyUpdated } from "@/lib/companies/company-events";

const acceptedTypes = new Set(["image/png", "image/jpeg", "image/webp", "image/svg+xml"]);

export default function CompanyLogoSettings({ companyId, updatedAt, onUpdated }: {
  companyId: string;
  updatedAt?: string | null;
  onUpdated: (updatedAt: string | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(file?: File) {
    if (!file) return;
    if (!acceptedTypes.has(file.type) || file.size > 2_000_000) {
      setError("Choisissez un PNG, JPG, JPEG, WEBP ou SVG de moins de 2 Mo.");
      return;
    }
    setBusy(true);
    setError(null);
    const result = await uploadCompanyLogo(companyId, file);
    setBusy(false);
    if (inputRef.current) inputRef.current.value = "";
    if (!result.ok) {
      setError(typeof result.error.message === "string" ? result.error.message : "Impossible d’enregistrer le logo.");
      return;
    }
    onUpdated(result.data.logoUpdatedAt);
    notifyCompanyUpdated();
  }

  async function remove() {
    setBusy(true);
    setError(null);
    const result = await removeCompanyLogo(companyId);
    setBusy(false);
    if (!result.ok) {
      setError(typeof result.error.message === "string" ? result.error.message : "Impossible de retirer le logo.");
      return;
    }
    onUpdated(null);
    notifyCompanyUpdated();
  }

  return (
    <section className="mt-6 rounded-ui-card border border-ui-border bg-ui-surface p-5 shadow-ui-card sm:p-6">
      <h2 className="font-title text-lg font-semibold text-ui-text">Logo de l’entreprise</h2>
      <p className="mt-1 text-sm text-ui-secondary">Apparaît sur les nouveaux devis et factures, dans leur aperçu et leur PDF.</p>
      <div className="mt-5 flex flex-wrap items-center gap-5">
        <CompanyLogo companyId={companyId} updatedAt={updatedAt} className="w-24" />
        <div className="space-y-2">
          <input ref={inputRef} type="file" accept=".png,.jpg,.jpeg,.webp,.svg,image/png,image/jpeg,image/webp,image/svg+xml" className="block max-w-full text-sm text-ui-secondary file:mr-3 file:rounded-ui-control file:border file:border-ui-border file:bg-white file:px-3 file:py-2 file:font-medium file:text-ui-text" disabled={busy} aria-label="Choisir un logo" onChange={(event) => void upload(event.target.files?.[0])} />
          <p className="text-xs text-ui-secondary">PNG, JPG, JPEG, WEBP ou SVG · 2 Mo maximum. Privilégiez un logo SVG pour une meilleure qualité d’image.</p>
          {updatedAt && <button type="button" onClick={() => void remove()} disabled={busy} className="text-sm font-medium text-ui-danger hover:underline disabled:opacity-50">Retirer le logo</button>}
          {busy && <p role="status" className="text-sm text-ui-secondary">Mise à jour du logo…</p>}
          {error && <p role="alert" className="text-sm text-ui-danger">{error}</p>}
        </div>
      </div>
    </section>
  );
}
