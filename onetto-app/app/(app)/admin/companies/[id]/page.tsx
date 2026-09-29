import Link from "next/link";
import { apiServer } from "@/lib/api-server";

type Company = {
  id: string;
  name: string;
  email: string;
  siren: string;
  siret: string;
  status: string;
  owner: { id: string; firstname: string; lastname: string; email: string };
  companyUsers: Array<{
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
  documents: Array<{
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
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const response = await apiServer<Company>(`api/admin/companies/${id}`);
  if (!response.ok) return <p>Entreprise introuvable.</p>;
  const company = response.data;
  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-zinc-200 bg-white p-5">
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
        <ul className="mt-3 divide-y divide-zinc-100">
          {company.companyUsers.map((item) => (
            <li key={item.id} className="py-2 text-sm">
              {item.user.firstname} {item.user.lastname} · {item.role}
              {item.isHidden ? " · masqué" : ""}
            </li>
          ))}
        </ul>
      </section>
      <section className="rounded-2xl border border-zinc-200 bg-white p-5">
        <h3 className="font-semibold">Documents récents</h3>
        <ul className="mt-3 divide-y divide-zinc-100">
          {company.documents.map((document) => (
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
