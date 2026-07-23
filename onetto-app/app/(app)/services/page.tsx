import ServiceSection from '@/app/components/organisms/ServiceSection'
import { Service } from '@/app/types'
import { servicesData } from '@/shared/services'
import { Plus } from 'lucide-react'
import { getMyCompaniesServer } from '@/lib/companies/companies.server'
import React from 'react'

async function services() {
  const companiesResponse = await getMyCompaniesServer();
  const activeCompany = companiesResponse.ok
    ? companiesResponse.data.companies.find((company) => company.id === companiesResponse.data.activeCompanyId)
    : undefined;
  const canCreate = activeCompany?.status !== 'CLOSED';

  return (
    <div className="w-full p-4">
      <h1 className="text-4xl font-black font-title">Mon catalogue de services</h1>

      <p className="text-gray-500 max-w-90 mt-3">Gérer vos services et gagnez du temps lors de la création de vos factures.</p>

      {!canCreate && <p className="mt-4 rounded-lg border border-red-100 bg-red-50/70 p-4 text-sm text-zinc-700">Cette entreprise est fermée : aucun nouveau service ne peut être créé.</p>}
      <ServiceSection services={servicesData} canCreate={canCreate} />
    </div>
  )
}

export default services
