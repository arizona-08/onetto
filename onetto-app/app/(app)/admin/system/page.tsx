import { apiServer } from "@/lib/api-server";
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

type System = {
  webhooks: Paginated<{
    id: string;
    provider: string;
    providerEventId: string;
    processedAt: string;
  }>;
  audits: Paginated<{
    id: string;
    action: string;
    targetType: string;
    targetId: string;
    createdAt: string;
    adminUser: { email: string };
  }>;
};
export default async function AdminSystemPage({
  searchParams,
}: {
  searchParams: Promise<AdminSearchParams>;
}) {
  const params = await searchParams;
  const webhooks = getAdminListState(params, "webhooksQ", "webhooksPage");
  const audits = getAdminListState(params, "auditsQ", "auditsPage");
  const response = await apiServer<System>(
    `api/admin/system?${new URLSearchParams({
      webhooksQ: webhooks.query,
      webhooksPage: String(webhooks.page),
      auditsQ: audits.query,
      auditsPage: String(audits.page),
    })}`,
  );
  if (!response.ok) return <p>Accès administrateur requis.</p>;
  return (
    <div className="space-y-4">
      <p className="text-sm text-zinc-600">
        Les webhooks et les actions administrateur sont des journaux conservés
        en lecture seule.
      </p>
      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Webhooks traités">
          <AdminListControls
            path="/admin/system"
            searchParams={params}
            pagination={response.data.webhooks.pagination}
            placeholder="Fournisseur ou référence d’événement"
            label="Webhooks"
            queryKey="webhooksQ"
            pageKey="webhooksPage"
          />
          <ul className="divide-y divide-zinc-100">
            {response.data.webhooks.items.length === 0 && (
              <li className="py-3 text-sm text-zinc-500">
                Aucun webhook trouvé.
              </li>
            )}
            {response.data.webhooks.items.map((event) => (
              <li
                key={`${event.provider}-${event.id}`}
                className="py-2 text-sm"
              >
                <strong>{event.provider}</strong>{" "}
                <span className="font-mono text-xs text-zinc-500">
                  {event.providerEventId}
                </span>
              </li>
            ))}
          </ul>
        </Section>
        <Section title="Actions administrateur">
          <AdminListControls
            path="/admin/system"
            searchParams={params}
            pagination={response.data.audits.pagination}
            placeholder="Action, cible ou e-mail admin"
            label="Actions administrateur"
            queryKey="auditsQ"
            pageKey="auditsPage"
          />
          <ul className="divide-y divide-zinc-100">
            {response.data.audits.items.length === 0 && (
              <li className="py-3 text-sm text-zinc-500">
                Aucune action trouvée.
              </li>
            )}
            {response.data.audits.items.map((audit) => (
              <li key={audit.id} className="py-2 text-sm">
                <strong>{audit.action}</strong>
                <span className="ml-2 text-zinc-500">
                  par {audit.adminUser.email}
                </span>
              </li>
            ))}
          </ul>
        </Section>
      </div>
    </div>
  );
}
function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-5">
      <h2 className="font-title text-lg font-semibold">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}
