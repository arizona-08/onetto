import Link from "next/link";
import { subscriptionPlanLabel } from "@/lib/subscription/plan-labels";
import { apiServer } from "@/lib/api-server";
import AdminInviteUser from "./AdminInviteUser";
import { AdminUserRowActions } from "../AdminResourceActions";
import AdminListControls, {
  AdminSearchParams,
  getAdminListState,
} from "@/app/components/AdminListControls";
type Users = {
  items: Array<{
    id: string;
    firstname: string;
    lastname: string;
    email: string;
    appUserRole: "SUPERADMIN" | "ADMIN" | "USER";
    bannedAt: string | null;
    closedAt: string | null;
    subscription: { subscriptionPlan: string; isActive: boolean } | null;
    _count: { ownedCompanies: number };
  }>;
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};
export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<AdminSearchParams>;
}) {
  const params = await searchParams;
  const { query, page } = getAdminListState(params);
  const response = await apiServer<Users>(
    `api/admin/users?${new URLSearchParams({ q: query, page: String(page) })}`,
  );
  if (!response.ok) return <p>Accès administrateur requis.</p>;
  return (
    <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 p-5">
        <h2 className="font-title text-lg font-semibold">
          Utilisateurs ({response.data.pagination.total})
        </h2>
        <AdminInviteUser />
      </header>
      <AdminListControls
        path="/admin/users"
        searchParams={params}
        pagination={response.data.pagination}
        placeholder="Nom ou adresse e-mail"
        label="Utilisateurs"
      />
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-50 text-zinc-500">
            <tr>
              <th className="p-4">Nom</th>
              <th className="p-4">E-mail</th>
              <th className="p-4">Abonnement</th>
              <th className="p-4">Entreprises</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {response.data.items.length === 0 && (
              <tr>
                <td colSpan={5} className="p-5 text-center text-zinc-500">
                  Aucun utilisateur trouvé.
                </td>
              </tr>
            )}
            {response.data.items.map((user) => (
              <tr key={user.id} className="border-t border-zinc-100">
                <td className="p-4 font-medium">
                  <Link
                    href={`/admin/users/${user.id}`}
                    className="hover:text-primary"
                  >
                    {user.firstname} {user.lastname}
                  </Link>
                  {user.bannedAt && (
                    <span className="ml-2 text-xs text-red-700">BANNI</span>
                  )}
                  {user.appUserRole !== "USER" && (
                    <span className="ml-2 text-xs text-primary">
                      {user.appUserRole}
                    </span>
                  )}
                </td>
                <td className="p-4">{user.email}</td>
                <td className="p-4">
                  {subscriptionPlanLabel(user.subscription?.subscriptionPlan)}
                </td>
                <td className="p-4">{user._count.ownedCompanies}</td>
                <td className="p-4">
                  <AdminUserRowActions user={user} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
