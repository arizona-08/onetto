import Link from "next/link";
import { apiServer } from "@/lib/api-server";
import { AdminCompanyRowActions } from "../AdminResourceActions";
import AdminListControls, {
  AdminSearchParams,
  getAdminListState,
} from "@/app/components/AdminListControls";

type Companies = {
  items: Array<{
    id: string;
    name: string;
    email: string;
    siren: string;
    status: string;
    closedByAccountClosureAt: string | null;
    subjectToVat: boolean;
    isPaymentAccountConnected: boolean;
    owner: { firstname: string; lastname: string };
    _count: { clients: number; services: number; documents: number };
  }>;
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

export default async function AdminCompaniesPage({
  searchParams,
}: {
  searchParams: Promise<AdminSearchParams>;
}) {
  const params = await searchParams;
  const { query, page } = getAdminListState(params);
  const response = await apiServer<Companies>(
    `api/admin/companies?${new URLSearchParams({ q: query, page: String(page) })}`,
  );
  if (!response.ok) return <p>Accès administrateur requis.</p>;

  return (
    <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
      <header className="border-b border-zinc-100 p-5">
        <h2 className="font-title text-lg font-semibold">
          Entreprises ({response.data.pagination.total})
        </h2>
      </header>
      <AdminListControls
        path="/admin/companies"
        searchParams={params}
        pagination={response.data.pagination}
        placeholder="Entreprise, e-mail ou SIREN"
        label="Entreprises"
      />
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-50 text-zinc-500">
            <tr>
              <th className="p-4">Entreprise</th>
              <th className="p-4">Propriétaire</th>
              <th className="p-4">SIREN</th>
              <th className="p-4">Statut</th>
              <th className="p-4">Données</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {response.data.items.length === 0 && (
              <tr>
                <td colSpan={6} className="p-5 text-center text-zinc-500">
                  Aucune entreprise trouvée.
                </td>
              </tr>
            )}
            {response.data.items.map((company) => (
              <tr key={company.id} className="border-t border-zinc-100">
                <td className="p-4 font-medium">
                  <Link
                    className="hover:text-primary"
                    href={`/admin/companies/${company.id}`}
                  >
                    {company.name}
                  </Link>
                </td>
                <td className="p-4">
                  {company.owner.firstname} {company.owner.lastname}
                </td>
                <td className="p-4">{company.siren}</td>
                <td className="p-4">{company.status}</td>
                <td className="p-4 text-zinc-500">
                  {company._count.clients} clients · {company._count.services}{" "}
                  prestations · {company._count.documents} documents
                </td>
                <td className="p-4">
                  <AdminCompanyRowActions company={company} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
