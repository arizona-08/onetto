import ClientSection from "@/app/components/organisms/ClientsSection";
import {
  getActiveCompanyClientsServer,
  getMyCompaniesServer,
} from "@/lib/companies/companies.server";
import { UsersRound } from "lucide-react";

async function clients() {
  const [companiesResponse, clientsResponse] = await Promise.all([
    getMyCompaniesServer(),
    getActiveCompanyClientsServer(),
  ]);
  const activeCompany = companiesResponse.ok
    ? companiesResponse.data.companies.find(
        (company) => company.id === companiesResponse.data.activeCompanyId,
      )
    : undefined;
  const canCreate = activeCompany?.status !== "CLOSED";
  const clientsData = clientsResponse.ok
    ? clientsResponse.data.map((client) => ({
        id: client.id,
        name: client.name,
        email: client.email,
        address: client.address,
        city: client.city,
        postalCode: client.postalCode,
        country: client.country,
        clientType: client.clientType,
        siren: client.siren ?? undefined,
        vatNumber: client.vatNumber ?? undefined,
        electronicAddress: client.electronicAddress ?? undefined,
        electronicAddressScheme: client.electronicAddressScheme ?? undefined,
      }))
    : [];

  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 py-7 sm:px-7 lg:px-9">
      <header className="flex items-start gap-4">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-ui-control bg-ui-primary-soft text-ui-primary">
          <UsersRound className="h-6 w-6" aria-hidden="true" />
        </span>
        <div>
          <h1 className="font-title text-3xl font-semibold tracking-tight text-ui-text sm:text-4xl">
            Mon catalogue de clients
          </h1>
          <p className="mt-1 text-sm text-ui-secondary sm:text-base">
            Gérez vos clients et gagnez du temps lors de la création de vos factures.
          </p>
        </div>
      </header>

      {!canCreate && (
        <p className="mt-4 rounded-lg border border-red-100 bg-red-50/70 p-4 text-sm text-zinc-700">
          Cette entreprise est fermée : aucun nouveau client ne peut être créé.
        </p>
      )}
      <ClientSection clients={clientsData} canCreate={canCreate} />
    </div>
  );
}

export default clients;
