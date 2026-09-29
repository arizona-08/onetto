import Link from "next/link";
import { apiServer } from "@/lib/api-server";

type User = {
  id: string;
  firstname: string;
  lastname: string;
  email: string;
  accountType: string;
  isAdmin: boolean;
  lastConnectedCompany: { id: string; name: string } | null;
  subscription: {
    subscriptionPlan: string;
    isActive: boolean;
    pendingSubscriptionPlan: string | null;
  } | null;
  subscriptionHistory: Array<{ subscriptionPlan: string; createdAt: string }>;
  ownedCompanies: Array<{ id: string; name: string; status: string }>;
  companies: Array<{
    id: string;
    role: string;
    company: { id: string; name: string; status: string };
  }>;
};
export default async function AdminUserPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const response = await apiServer<User>(`api/admin/users/${id}`);
  if (!response.ok) return <p>Utilisateur introuvable.</p>;
  const user = response.data;
  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-zinc-200 bg-white p-5">
        <p className="text-sm text-primary">{user.accountType}</p>
        <h2 className="font-title text-2xl font-semibold">
          {user.firstname} {user.lastname}
        </h2>
        <p className="text-zinc-600">{user.email}</p>
      </section>
      <section className="rounded-2xl border border-zinc-200 bg-white p-5">
        <h3 className="font-semibold">Abonnement</h3>
        <p className="mt-2 text-sm">
          {user.subscription?.subscriptionPlan ?? "FREE"} ·{" "}
          {user.subscription?.isActive ? "actif" : "inactif"}
        </p>
      </section>
      <section className="rounded-2xl border border-zinc-200 bg-white p-5">
        <h3 className="font-semibold">Entreprises possédées</h3>
        <ul className="mt-2 space-y-2 text-sm">
          {user.ownedCompanies.map((company) => (
            <li key={company.id}>
              <Link
                className="text-primary hover:underline"
                href={`/admin/companies/${company.id}`}
              >
                {company.name}
              </Link>{" "}
              · {company.status}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
