import ClientSection from '@/app/components/organisms/ClientsSection'
import {
  getActiveCompanyClientsServer,
  getMyCompaniesServer,
} from '@/lib/companies/companies.server'

async function clients() {
  const [companiesResponse, clientsResponse] = await Promise.all([
    getMyCompaniesServer(),
    getActiveCompanyClientsServer(),
  ]);
  const activeCompany = companiesResponse.ok
    ? companiesResponse.data.companies.find((company) => company.id === companiesResponse.data.activeCompanyId)
    : undefined;
  const canCreate = activeCompany?.status !== 'CLOSED';
  const clientsData = clientsResponse.ok
    ? clientsResponse.data.map((client) => ({
        id: client.id,
        name: client.name,
        email: client.email,
        address: client.address,
        city: client.city,
        postalCode: client.postalCode,
        country: client.country,
      }))
    : [];

  return (
    <div className="mx-auto w-full max-w-6xl p-4">
      <h1 className="text-4xl font-semibold font-title">Mon catalogue de clients</h1>

      <p className="text-gray-500 max-w-90 mt-3">Gérer vos clients et gagnez du temps lors de la création de vos factures.</p>

      {!canCreate && <p className="mt-4 rounded-lg border border-red-100 bg-red-50/70 p-4 text-sm text-zinc-700">Cette entreprise est fermée : aucun nouveau client ne peut être créé.</p>}
      <ClientSection clients={clientsData} canCreate={canCreate} />
    </div>
  )
}

export default clients
