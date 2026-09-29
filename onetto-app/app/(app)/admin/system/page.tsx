import { apiServer } from "@/lib/api-server";

type System = {
  paymentWebhooks: Array<{
    id: string;
    provider: string;
    providerEventId: string;
    processedAt: string;
  }>;
  stripeWebhooks: Array<{
    id: string;
    providerEventId: string;
    processedAt: string;
  }>;
  audits: Array<{
    id: string;
    action: string;
    targetType: string;
    targetId: string;
    createdAt: string;
    adminUser: { email: string };
  }>;
};
export default async function AdminSystemPage() {
  const response = await apiServer<System>("api/admin/system");
  if (!response.ok) return <p>Accès administrateur requis.</p>;
  const events = [
    ...response.data.paymentWebhooks.map((event) => ({
      ...event,
      provider: event.provider,
    })),
    ...response.data.stripeWebhooks.map((event) => ({
      ...event,
      provider: "STRIPE",
    })),
  ].sort((a, b) => b.processedAt.localeCompare(a.processedAt));
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Section title="Webhooks traités">
        {events.map((event) => (
          <li key={event.id} className="py-2 text-sm">
            <strong>{event.provider}</strong>{" "}
            <span className="font-mono text-xs text-zinc-500">
              {event.providerEventId}
            </span>
          </li>
        ))}
      </Section>
      <Section title="Actions administrateur">
        {response.data.audits.map((audit) => (
          <li key={audit.id} className="py-2 text-sm">
            <strong>{audit.action}</strong>
            <span className="ml-2 text-zinc-500">
              par {audit.adminUser.email}
            </span>
          </li>
        ))}
      </Section>
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
      <ul className="mt-3 divide-y divide-zinc-100">{children}</ul>
    </section>
  );
}
