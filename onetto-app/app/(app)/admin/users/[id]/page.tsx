import Link from "next/link";
import { apiServer } from "@/lib/api-server";
import UserManagement from "./UserManagement";
import UserSubscriptionManagement from "./UserSubscriptionManagement";
import { AdminCompanyRowActions } from "../../AdminResourceActions";
import AdminListControls, {
  AdminSearchParams,
  getAdminListState,
} from "@/app/components/AdminListControls";

type User = {
  id: string;
  firstname: string;
  lastname: string;
  bannedAt: string | null;
  email: string;
  accountType: string;
  appUserRole: "SUPERADMIN" | "ADMIN" | "USER";
  lastConnectedCompany: { id: string; name: string } | null;
  subscription: {
    subscriptionPlan: string;
    isActive: boolean;
    subscriptionId: string | null;
    pendingPlanEffectiveAt: string | null;
    pendingSubscriptionPlan: string | null;
  } | null;
  subscriptionHistory: Array<{ subscriptionPlan: string; createdAt: string }>;
  ownedCompanies: Array<{
    id: string;
    name: string;
    status: string;
    closedByAccountClosureAt: string | null;
  }>;
  companies: Array<{
    id: string;
    role: string;
    company: { id: string; name: string; status: string };
  }>;
};
export default async function AdminUserPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<AdminSearchParams>;
}) {
  const { id } = await params;
  const filters = await searchParams;
  const { query, page } = getAdminListState(filters);
  const response = await apiServer<User>(`api/admin/users/${id}`);
  if (!response.ok) return <p>Utilisateur introuvable.</p>;
  const user = response.data;
  const ownedCompanies = user.ownedCompanies.filter((company) =>
    `${company.name} ${company.status}`
      .toLocaleLowerCase("fr-FR")
      .includes(query.toLocaleLowerCase("fr-FR")),
  );
  const pagination = {
    page,
    pageSize: 10,
    total: ownedCompanies.length,
    totalPages: Math.max(1, Math.ceil(ownedCompanies.length / 10)),
  };
  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-zinc-200 bg-white p-5">
        <p className="text-sm text-primary">{user.accountType}</p>
        <h2 className="font-title text-2xl font-semibold">
          {user.firstname} {user.lastname}
        </h2>
        <p className="text-zinc-600">{user.email}</p>
        {user.bannedAt && (
          <p className="mt-2 text-sm font-medium text-red-700">Compte banni</p>
        )}
      </section>
      <UserManagement user={user} />
      <UserSubscriptionManagement
        userId={user.id}
        appUserRole={user.appUserRole}
        accountType={user.accountType}
        subscription={user.subscription}
      />
      <section className="rounded-2xl border border-zinc-200 bg-white p-5">
        <h3 className="font-semibold">Entreprises possédées</h3>
        <AdminListControls
          path={`/admin/users/${id}`}
          searchParams={filters}
          pagination={pagination}
          placeholder="Entreprise ou statut"
          label="Entreprises possédées"
        />
        <ul className="mt-2 space-y-2 text-sm">
          {ownedCompanies.length === 0 && (
            <li className="py-3 text-zinc-500">Aucune entreprise trouvée.</li>
          )}
          {ownedCompanies.slice((page - 1) * 10, page * 10).map((company) => (
            <li
              key={company.id}
              className="flex items-center justify-between gap-2"
            >
              <span>
                <Link
                  className="text-primary hover:underline"
                  href={`/admin/companies/${company.id}`}
                >
                  {company.name}
                </Link>{" "}
                · {company.status}
              </span>
              <AdminCompanyRowActions company={company} />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
