import Link from "next/link";
import { apiServer } from "@/lib/api-server";
import {
  AdminCollaboratorRowActions,
  AdminCompanyRowActions,
} from "../../AdminResourceActions";
import AdminListControls, {
  AdminSearchParams,
  getAdminListState,
} from "@/app/components/AdminListControls";

type Paginated<T> = {
  items: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

type Company = {
  id: string;
  name: string;
  email: string;
  siren: string;
  siret: string;
  status: string;
  closedByAccountClosureAt: string | null;
  owner: { id: string; firstname: string; lastname: string; email: string };
  companyUsers: Paginated<{
    id: string;
    role: string;
    isHidden: boolean;
    user: { firstname: string; lastname: string; email: string };
  }>;
  services: Array<{
    id: string;
    name: string;
    category: string;
    unitPrice: number;
  }>;
  documents: Paginated<{
    id: string;
    type: string;
    documentNumber: string | null;
    clientName: string;
    totalPrice: number;
    createdAt: string;
  }>;
  companyPaymentAccount: {
    provider: string;
    providerAccountId: string;
    verificationStatus: string;
  } | null;
};
export default async function AdminCompanyPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<AdminSearchParams>;
}) {
  const { id } = await params;
  const filters = await searchParams;
  const collaborators = getAdminListState(
    filters,
    "collaboratorsQ",
    "collaboratorsPage",
  );
  const documents = getAdminListState(filters, "documentsQ", "documentsPage");
  const path = `/admin/companies/${id}`;
  const response = await apiServer<Company>(
    `api/admin/companies/${id}?${new URLSearchParams({
      collaboratorsQ: collaborators.query,
      collaboratorsPage: String(collaborators.page),
      documentsQ: documents.query,
      documentsPage: String(documents.page),
    })}`,
  );
  if (!response.ok) return <p>Entreprise introuvable.</p>;
  const company = response.data;
  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-zinc-200 bg-white p-5">
        <div className="float-right">
          <AdminCompanyRowActions company={company} />
        </div>
        <p className="text-sm text-primary">{company.status}</p>
        <h2 className="font-title text-2xl font-semibold">{company.name}</h2>
        <p className="text-sm text-zinc-600">
          {company.siren} · {company.siret}
        </p>
        <p className="mt-3 text-sm">
          Propriétaire :{" "}
          <Link
            className="text-primary hover:underline"
            href={`/admin/users/${company.owner.id}`}
          >
            {company.owner.firstname} {company.owner.lastname}
          </Link>
        </p>
      </section>
      <section className="rounded-2xl border border-zinc-200 bg-white p-5">
        <h3 className="font-semibold">Collaborateurs</h3>
        <AdminListControls
          path={path}
          searchParams={filters}
          pagination={company.companyUsers.pagination}
          placeholder="Nom ou adresse e-mail"
          label="Collaborateurs"
          queryKey="collaboratorsQ"
          pageKey="collaboratorsPage"
        />
        <ul className="mt-3 divide-y divide-zinc-100">
          {company.companyUsers.items.length === 0 && (
            <li className="py-3 text-sm text-zinc-500">
              Aucun collaborateur trouvé.
            </li>
          )}
          {company.companyUsers.items.map((item) => (
            <li key={item.id} className="py-2 text-sm">
              <div className="flex items-center justify-between gap-2">
                <span>
                  {item.user.firstname} {item.user.lastname} · {item.role}
                  {item.isHidden ? " · masqué" : ""}
                </span>
                <AdminCollaboratorRowActions
                  collaborator={item}
                  active={company.status === "ACTIVE"}
                />
              </div>
            </li>
          ))}
        </ul>
      </section>
      <section className="rounded-2xl border border-zinc-200 bg-white p-5">
        <h3 className="font-semibold">Documents</h3>
        <p className="mt-1 text-sm text-zinc-500">
          Les documents émis sont conservés en lecture seule.
        </p>
        <AdminListControls
          path={path}
          searchParams={filters}
          pagination={company.documents.pagination}
          placeholder="Numéro de document ou client"
          label="Documents"
          queryKey="documentsQ"
          pageKey="documentsPage"
        />
        <ul className="mt-3 divide-y divide-zinc-100">
          {company.documents.items.length === 0 && (
            <li className="py-3 text-sm text-zinc-500">
              Aucun document trouvé.
            </li>
          )}
          {company.documents.items.map((document) => (
            <li key={document.id} className="py-2 text-sm">
              {document.documentNumber ?? document.type} · {document.clientName}{" "}
              ·{" "}
              {document.totalPrice.toLocaleString("fr-FR", {
                style: "currency",
                currency: "EUR",
              })}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
