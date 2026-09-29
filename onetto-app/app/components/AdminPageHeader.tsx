"use client";

import { usePathname } from "next/navigation";

const pageTitles: Record<string, string> = {
  "/admin": "Dashboard",
  "/admin/users": "Utilisateurs",
  "/admin/companies": "Entreprises",
  "/admin/services": "Prestations",
  "/admin/subscriptions": "Abonnements",
  "/admin/payments": "Paiements",
  "/admin/system": "Système",
};

export default function AdminPageHeader() {
  const pathname = usePathname();
  const title =
    pageTitles[pathname] ??
    (pathname.startsWith("/admin/users/")
      ? "Fiche utilisateur"
      : pathname.startsWith("/admin/companies/")
        ? "Fiche entreprise"
        : "Administration");

  return (
    <h1 className="font-title text-2xl font-semibold text-zinc-900">{title}</h1>
  );
}
