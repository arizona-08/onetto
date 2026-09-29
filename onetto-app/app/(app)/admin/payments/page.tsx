import Link from "next/link";
import { apiServer } from "@/lib/api-server";

type Payments = {
  items: Array<{
    id: string;
    amountInCents: number;
    provider: string;
    providerReference: string;
    status: string;
    createdAt: string;
    invoice: {
      id: string;
      documentNumber: string | null;
      company: { id: string; name: string };
    };
    payByBankPaymentAttempts: Array<{
      providerPaymentId: string;
      failureReason: string | null;
    }>;
  }>;
  pagination: { total: number };
};
export default async function AdminPaymentsPage() {
  const response = await apiServer<Payments>("api/admin/payments");
  if (!response.ok) return <p>Accès administrateur requis.</p>;
  return (
    <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
      <header className="border-b border-zinc-100 p-5">
        <h2 className="font-title text-lg font-semibold">
          Paiements ({response.data.pagination.total})
        </h2>
        <p className="mt-1 text-sm text-zinc-500">
          Vue de diagnostic uniquement : les statuts ne sont jamais modifiés
          manuellement.
        </p>
      </header>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-50 text-zinc-500">
            <tr>
              <th className="p-4">Facture</th>
              <th className="p-4">Entreprise</th>
              <th className="p-4">Montant</th>
              <th className="p-4">Provider</th>
              <th className="p-4">Statut</th>
              <th className="p-4">Référence</th>
            </tr>
          </thead>
          <tbody>
            {response.data.items.map((payment) => (
              <tr key={payment.id} className="border-t border-zinc-100">
                <td className="p-4">
                  {payment.invoice.documentNumber ?? "Facture"}
                </td>
                <td className="p-4">
                  <Link
                    className="hover:text-primary"
                    href={`/admin/companies/${payment.invoice.company.id}`}
                  >
                    {payment.invoice.company.name}
                  </Link>
                </td>
                <td className="p-4">
                  {(payment.amountInCents / 100).toLocaleString("fr-FR", {
                    style: "currency",
                    currency: "EUR",
                  })}
                </td>
                <td className="p-4">{payment.provider}</td>
                <td className="p-4">{payment.status}</td>
                <td className="p-4 font-mono text-xs text-zinc-500">
                  {payment.providerReference}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
