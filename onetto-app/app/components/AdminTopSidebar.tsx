"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Building2,
  CreditCard,
  LayoutDashboard,
  LogOut,
  Package,
  Settings2,
  Users,
} from "lucide-react";
import { logout } from "@/lib/auth/auth";
import { useAuthUser } from "./context/AuthUserContext";
import { useToast } from "./context/ToastContext";

const adminLinks = [
  { name: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { name: "Utilisateurs", href: "/admin/users", icon: Users },
  { name: "Entreprises", href: "/admin/companies", icon: Building2 },
  { name: "Prestations", href: "/admin/services", icon: Package },
  { name: "Abonnements", href: "/admin/subscriptions", icon: CreditCard },
  { name: "Paiements", href: "/admin/payments", icon: CreditCard },
  { name: "Système", href: "/admin/system", icon: Settings2 },
];

export default function AdminTopSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuthUser();
  const { showToast } = useToast();

  async function handleLogout() {
    const response = await logout();
    if (!response.ok) {
      showToast("La déconnexion a échoué. Veuillez réessayer.", "error");
      return;
    }
    router.push("/auth/login");
  }

  return (
    <aside className="flex w-full shrink-0 flex-col border-b border-zinc-200 bg-white p-4 lg:h-screen lg:w-64 lg:border-b-0 lg:border-r">
      <div className="border-b border-primary/15 pb-4">
        <p className="font-title text-2xl font-bold text-primary">ONETTO</p>
        <h1 className="mt-1 text-sm font-medium text-zinc-600">
          Administration
        </h1>
      </div>
      <nav className="mt-4 flex flex-wrap gap-1 lg:block">
        {adminLinks.map((link) => {
          const Icon = link.icon;
          const active =
            link.href === "/admin"
              ? pathname === link.href
              : pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors lg:mb-1 ${active ? "bg-primary/10 font-semibold text-primary" : "text-zinc-600 hover:bg-zinc-100"}`}
            >
              <Icon className="h-4 w-4" />
              {link.name}
            </Link>
          );
        })}
      </nav>
      <div className="mt-4 border-t border-zinc-100 pt-4 lg:mt-auto">
        <p className="truncate text-sm font-medium text-zinc-800">
          {user ? `${user.firstname} ${user.lastname}` : "Administrateur"}
        </p>
        <p className="truncate text-xs text-zinc-500">{user?.email}</p>
        <button
          type="button"
          onClick={() => void handleLogout()}
          className="mt-3 flex items-center gap-2 text-sm text-red-600 hover:text-red-700"
        >
          <LogOut className="h-4 w-4" />
          Se déconnecter
        </button>
      </div>
    </aside>
  );
}
