"use client";
import React from "react";
import BurgerMenu from "./molecules/BurgerMenu";
import {
  Archive,
  Bell,
  Building,
  ChevronDown,
  FileChartColumnIncreasing,
  LayoutDashboardIcon,
  LogOut,
  SettingsIcon,
  TriangleAlert,
  UserIcon,
  Waypoints,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { logout } from "@/lib/auth/auth";
import { getMyCompanies, selectCompany } from "@/lib/companies/companies";
import { Company } from "@/lib/companies/dtos/create-company.dto";
import Link from "next/link";
import Image from "next/image";
import { useAuthUser } from "./context/AuthUserContext";
import {
  COMPANY_UPDATED_EVENT,
  notifyCompanyUpdated,
} from "@/lib/companies/company-events";
import { useToast } from "./context/ToastContext";

const salesLinks = [
  { name: "Devis & factures", href: "/documents" },
  { name: "Mes clients", href: "/customers" },
  { name: "Produits & services", href: "/services" },
];

type NavigationLink = {
  name: string;
  href: string;
  icon: React.ReactNode;
  children?: typeof salesLinks;
};

const userLinks: NavigationLink[] = [
  { name: "Dashboard", href: "/dashboard", icon: <LayoutDashboardIcon /> },
  {
    name: "Ventes",
    href: "/documents",
    icon: <FileChartColumnIncreasing />,
    children: salesLinks,
  },
  { name: "Mes entreprises", href: "/my-companies", icon: <Building /> },
  { name: "Notifications", href: "/notifications", icon: <Bell /> },
  { name: "Archives", href: "/archives", icon: <Archive /> },
  { name: "Paramètres", href: "/settings/account", icon: <SettingsIcon /> },
];

const adminLinks: NavigationLink[] = [
  { name: "Dashboard", href: "/admin", icon: <LayoutDashboardIcon /> },
  { name: "Utilisateurs", href: "/admin/users", icon: <UserIcon /> },
  { name: "Entreprises", href: "/admin/companies", icon: <Building /> },
  { name: "Prestations", href: "/admin/services", icon: <Waypoints /> },
  { name: "Abonnements", href: "/admin/subscriptions", icon: <SettingsIcon /> },
  {
    name: "Paiements",
    href: "/admin/payments",
    icon: <FileChartColumnIncreasing />,
  },
  { name: "Système", href: "/admin/system", icon: <Archive /> },
];

function TopSidebar() {
  const [isOpen, setIsOpen] = React.useState(false);
  const { user } = useAuthUser();
  const { showToast } = useToast();

  const pathname = usePathname();
  const router = useRouter();
  const appUserRole = user?.appUserRole;
  const [isSalesOpen, setIsSalesOpen] = React.useState(() =>
    salesLinks.some((link) =>
      pathname === link.href || pathname.startsWith(link.href + "/"),
    ),
  );

  async function handleLogout() {
    const response = await logout();

    if (!response.ok) {
      showToast("La déconnexion a échoué. Veuillez réessayer.", "error");
      return;
    }

    router.push("/auth/login");
  }

  const [showMobileCompaniesMenu, setShowMobileCompaniesMenu] =
    React.useState(false);
  const [companies, setCompanies] = React.useState<Company[]>([]);
  const [activeCompanyId, setActiveCompanyId] = React.useState<string | null>(
    null,
  );

  const loadCompanies = React.useCallback(async () => {
    const response = await getMyCompanies();
    if (response.ok) {
      setCompanies(response.data.companies);
      setActiveCompanyId(response.data.activeCompanyId);
    }
  }, []);

  React.useEffect(() => {
    if (
      (appUserRole && appUserRole !== "USER") ||
      pathname.startsWith("/admin")
    ) {
      return;
    }

    queueMicrotask(() => void loadCompanies());
    window.addEventListener(COMPANY_UPDATED_EVENT, loadCompanies);
    return () =>
      window.removeEventListener(COMPANY_UPDATED_EVENT, loadCompanies);
  }, [loadCompanies, pathname, appUserRole]);

  const activeCompany = companies.find(
    (company) => company.id === activeCompanyId,
  );
  const otherCompanies = companies.filter(
    (company) => company.id !== activeCompanyId && !company.isHidden,
  );
  const hasCompanyActionRequired =
    companies.length === 0 ||
    companies.some((company) => company.hasRequiredAction);

  function getInitials(name: string) {
    return name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase();
  }

  async function handleCompanySelection(companyId: string) {
    const response = await selectCompany(companyId);
    if (!response.ok) {
      showToast(
        "Impossible de sélectionner cette entreprise. Veuillez réessayer.",
        "error",
      );
      return;
    }

    setActiveCompanyId(companyId);
    setShowMobileCompaniesMenu(false);
    notifyCompanyUpdated();
    router.refresh();
  }

  const hasAdminAccess =
    (user !== null && user.appUserRole !== "USER") ||
    (user === null && pathname.startsWith("/admin"));
  const links = hasAdminAccess ? adminLinks : userLinks;

  return (
    <aside className="relative z-20 w-full shrink-0 border-b border-ui-border bg-ui-surface p-4 lg:sticky lg:top-0 lg:flex lg:h-dvh lg:w-64 lg:flex-col lg:border-r lg:border-b-0 lg:px-4 lg:py-7">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 lg:px-2">
          <BurgerMenu trigger={() => setIsOpen(!isOpen)} expanded={isOpen} />
          <Link
            href={hasAdminAccess ? "/admin" : "/dashboard"}
            className="flex items-center gap-2.5 rounded-lg font-title text-2xl font-bold tracking-tight text-ui-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ui-primary"
          >
            <Image src="/logos/Onetto logo purple.svg" alt="" width={30} height={30} />
            Onetto
          </Link>
        </div>

        <div className="relative">
          {/* profile pic */}
          <button
            type="button"
            aria-label="Ouvrir le menu du compte"
            aria-expanded={showMobileCompaniesMenu}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-ui-primary-soft text-xs font-semibold text-ui-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ui-primary lg:hidden"
            onClick={() => setShowMobileCompaniesMenu(!showMobileCompaniesMenu)}
          >
            {hasAdminAccess
              ? user
                ? getInitials(user.firstname + " " + user.lastname)
                : "A"
              : activeCompany
                ? getInitials(activeCompany.name)
                : "O"}
          </button>

          {/* mobile companies menu */}
          {showMobileCompaniesMenu && (
            <div className="absolute right-0 top-full z-20 mt-2 w-64 rounded-2xl border border-ui-border bg-ui-surface shadow-ui-popover lg:hidden">
                <div className="px-4 py-3">
                  {!hasAdminAccess && (
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ui-primary-soft text-xs font-semibold text-ui-primary">
                        {activeCompany ? getInitials(activeCompany.name) : "O"}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-ui-text">
                          {activeCompany?.name ??
                            "Aucune entreprise sélectionnée"}
                        </p>
                        <p className="truncate text-xs text-ui-secondary">
                          {activeCompany?.email ?? "Gérer mes entreprises"}
                        </p>
                      </div>
                    </div>
                  )}
                  {!hasAdminAccess && <hr className="my-3 border-ui-border" />}
                  <p className="truncate text-sm font-medium text-ui-text">
                    {user
                      ? `${user.firstname} ${user.lastname}`
                      : "Chargement du compte…"}
                  </p>
                  <p className="truncate text-xs text-ui-secondary">
                    {user?.email ?? ""}
                  </p>
                </div>
                {!hasAdminAccess && (
                  <>
                    <hr className="border-ui-border" />
                    <ul className="max-h-48 overflow-y-auto">
                      {otherCompanies.map((company) => (
                        <li key={company.id} className="overflow-hidden">
                          <button
                            type="button"
                            onClick={() => void handleCompanySelection(company.id)}
                            className="flex w-full items-center gap-2 px-4 py-2 text-left hover:bg-ui-subtle focus-visible:outline-2 focus-visible:outline-ui-primary"
                          >
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ui-primary-soft text-xs font-semibold text-ui-primary">
                              {getInitials(company.name)}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate">{company.name}</p>
                              <p className="truncate text-xs text-ui-secondary">
                                {company.email}
                              </p>
                            </div>
                          </button>
                        </li>
                      ))}
                    </ul>

                    <Link
                      href="/my-companies"
                      className="mx-4 mt-3 block rounded-md border border-ui-border px-3 py-2 text-center text-sm font-medium text-ui-secondary"
                      onClick={() => setShowMobileCompaniesMenu(false)}
                    >
                      Gérer mes entreprises
                    </Link>
                  </>
                )}

                <hr className="my-3 block text-zinc-200 w-full max-w-35 mx-auto" />

                <button
                  type="button"
                  className="mb-4 flex w-full items-center justify-center rounded-lg py-2 text-sm text-red-600 hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-ui-primary"
                  onClick={() => void handleLogout()}
                >
                  <span className="flex items-center gap-3">
                    Se déconnecter <LogOut className="w-4 h-4" />
                  </span>
                </button>
            </div>
          )}
        </div>
      </div>

      <div
        id="app-navigation"
        className={`absolute left-0 top-full z-10 w-full overflow-hidden border-ui-border bg-ui-surface transition-all duration-150 ${isOpen ? "max-h-[70vh] overflow-y-auto border-b shadow-ui-popover" : "invisible max-h-0"} lg:visible lg:relative lg:top-0 lg:mt-10 lg:flex lg:max-h-none lg:flex-1 lg:flex-col lg:justify-between lg:overflow-visible lg:border-0 lg:shadow-none`}
      >
        <nav className="mt-2" aria-label="Navigation principale">
          <ul className="px-2 lg:px-0">
            {links.map((link) => {
              if ("children" in link && link.children) {
                const hasCurrentSalesPage = link.children.some(
                  (child) =>
                    pathname === child.href ||
                    pathname.startsWith(child.href + "/"),
                );
                return (
                  <li key={link.name} className="mb-1">
                    <button
                      type="button"
                      aria-expanded={isSalesOpen}
                      aria-controls="sales-navigation"
                      onClick={() => setIsSalesOpen((open) => !open)}
                      className={`flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ui-primary ${hasCurrentSalesPage ? "font-semibold text-ui-text" : "font-medium text-ui-text hover:bg-ui-subtle"}`}
                    >
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center [&_svg]:h-5 [&_svg]:w-5 [&_svg]:stroke-[1.75]">{link.icon}</span>
                      <span className="min-w-0 flex-1 truncate">{link.name}</span>
                      <ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${isSalesOpen ? "rotate-180" : ""}`} aria-hidden="true" />
                    </button>
                    {isSalesOpen && (
                      <ul id="sales-navigation" className="mt-1 space-y-1 pl-8">
                        {link.children.map((child) => {
                          const isCurrent = pathname === child.href || pathname.startsWith(child.href + "/");
                          return (
                            <li key={child.href}>
                              <Link
                                href={child.href}
                                aria-current={isCurrent ? "page" : undefined}
                                onClick={() => setIsOpen(false)}
                                className={`block min-h-10 rounded-xl px-3 py-2 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ui-primary ${isCurrent ? "bg-ui-primary-soft font-semibold text-ui-primary" : "text-ui-secondary hover:bg-ui-subtle hover:text-ui-text"}`}
                              >
                                {child.name}
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </li>
                );
              }
              const isCurrentPathName = hasAdminAccess
                ? pathname === link.href ||
                  (link.href !== "/admin" &&
                    pathname.startsWith(link.href + "/"))
                : pathname.split("/")[1] === link.href.split("/")[1];
              return (
                <li key={link.name} className="mb-1">
                  <a
                    href={link.href}
                    aria-current={isCurrentPathName ? "page" : undefined}
                    onClick={() => setIsOpen(false)}
                    className={`flex min-h-11 items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ui-primary ${isCurrentPathName ? "bg-ui-primary-soft font-semibold text-ui-primary" : "font-medium text-ui-text hover:bg-ui-subtle hover:text-ui-primary"}`}
                  >
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center [&_svg]:h-5 [&_svg]:w-5 [&_svg]:stroke-[1.75]">{link.icon}</span>
                    <span className="min-w-0 flex-1 truncate">{link.name}</span>
                    {link.href === "/my-companies" &&
                      hasCompanyActionRequired && (
                        <TriangleAlert
                          aria-label="Une action est requise sur une entreprise"
                          className="ml-auto h-4 w-4 shrink-0 text-red-500"
                        />
                      )}
                  </a>
                </li>
              );
            })}
          </ul>
        </nav>

        <div
          role={otherCompanies.length > 0 && !hasAdminAccess ? "group" : undefined}
          aria-label={otherCompanies.length > 0 && !hasAdminAccess ? "Changer d’entreprise" : undefined}
          tabIndex={otherCompanies.length > 0 && !hasAdminAccess ? 0 : undefined}
          className="group relative mb-1 hidden w-full rounded-2xl border border-ui-border bg-ui-surface p-3 shadow-ui-card transition-colors hover:bg-ui-subtle focus-within:bg-ui-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ui-primary lg:block"
        >
          {!hasAdminAccess && otherCompanies.length > 0 && (
            <div className="invisible absolute bottom-full left-0 z-20 mb-2 w-full space-y-2 opacity-0 transition-all duration-150 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
              <ul className="max-h-56 overflow-y-auto rounded-2xl border border-ui-border bg-ui-surface shadow-ui-popover">
                {otherCompanies.map((company) => (
                  <li key={company.id} className="overflow-hidden">
                    <button
                      type="button"
                      onClick={() => void handleCompanySelection(company.id)}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-ui-subtle focus-visible:outline-2 focus-visible:outline-ui-primary"
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ui-primary-soft text-xs font-semibold text-ui-primary">
                        {getInitials(company.name)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">
                          {company.name}
                        </p>
                        <p className="truncate text-xs text-ui-secondary">
                          {company.email}
                        </p>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="space-y-3 cursor-pointer">
            {!hasAdminAccess && (
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ui-primary-soft text-xs font-semibold text-ui-primary">
                  {activeCompany ? getInitials(activeCompany.name) : "O"}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-ui-text">
                    {activeCompany?.name ?? "Aucune entreprise sélectionnée"}
                  </p>
                  <p className="truncate text-xs text-ui-secondary">
                    {activeCompany?.email ?? "Gérer mes entreprises"}
                  </p>
                </div>
              </div>
            )}
            {!hasAdminAccess && <hr className="border-ui-border" />}

            <div className="flex items-center justify-between gap-3 px-1">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-ui-text">
                  {user
                    ? `${user.firstname} ${user.lastname}`
                    : "Chargement du compte…"}
                </p>
                <p className="truncate text-xs text-ui-secondary">
                  {user?.email ?? ""}
                </p>
              </div>
              <button
                type="button"
                aria-label="Se déconnecter"
                title="Se déconnecter"
                onClick={() => void handleLogout()}
                className="shrink-0 rounded-md p-2 text-ui-secondary transition-colors hover:bg-red-50 hover:text-red-600"
              >
                <LogOut className="h-4 w-4 text-red-500" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}

export default TopSidebar;
