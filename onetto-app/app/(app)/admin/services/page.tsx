import { apiServer } from "@/lib/api-server";

type Services = {
  items: Array<{
    id: string;
    name: string;
    description: string;
    category: string;
    unitPrice: number;
    unit: string;
    taxRate: number | null;
    company: { name: string };
  }>;
  pagination: { total: number };
};
export default async function AdminServicesPage() {
  const response = await apiServer<Services>("api/admin/services");
  if (!response.ok) return <p>Accès administrateur requis.</p>;
  return (
    <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
      <header className="border-b border-zinc-100 p-5">
        <h2 className="font-title text-lg font-semibold">
          Prestations ({response.data.pagination.total})
        </h2>
      </header>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-50 text-zinc-500">
            <tr>
              <th className="p-4">Entreprise</th>
              <th className="p-4">Nom</th>
              <th className="p-4">Catégorie</th>
              <th className="p-4">Prix unitaire</th>
              <th className="p-4">TVA</th>
            </tr>
          </thead>
          <tbody>
            {response.data.items.map((service) => (
              <tr key={service.id} className="border-t border-zinc-100">
                <td className="p-4">{service.company.name}</td>
                <td className="p-4 font-medium">{service.name}</td>
                <td className="p-4">{service.category}</td>
                <td className="p-4">
                  {service.unitPrice.toLocaleString("fr-FR", {
                    style: "currency",
                    currency: "EUR",
                  })}{" "}
                  / {service.unit}
                </td>
                <td className="p-4">{service.taxRate ?? 0} %</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
