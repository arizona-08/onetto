import { getMyInvoicesAndEstimatesServer } from '@/lib/invoices/invoice.server';
import { getMyCompaniesServer } from '@/lib/companies/companies.server';
import { AlertTriangle, ChartLine, Check, CirclePlusIcon, File } from 'lucide-react';
import React from 'react'
import EstimatesInvoicesTable from '@/app/components/organisms/EstimatesInvoicesTable';
export const dynamic = 'force-dynamic'

async function invoices() {
  const invoicesResponse = await getMyInvoicesAndEstimatesServer(false);

  if (!invoicesResponse.ok) {
    console.error('Failed to fetch invoices:', invoicesResponse.error);
  }

  const invoices = invoicesResponse.ok ? invoicesResponse.data : [];
  const companiesResponse = await getMyCompaniesServer();
  const activeCompany = companiesResponse.ok
    ? companiesResponse.data.companies.find((company) => company.id === companiesResponse.data.activeCompanyId)
    : undefined;
  const currentDate = new Date().toISOString();
  
  return (
    <div className="w-full p-4">
      <h1 className="text-2xl font-black font-title">Gérer mes factures</h1>

      {!invoicesResponse.ok && (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900" role="alert">
          Les factures ne peuvent pas être chargées pour le moment. Vérifiez que l&apos;API est démarrée, puis réessayez.
        </div>
      )}

      <div className="mt-8 w-full overflow-x-auto pb-4">
        <div className="flex items-center gap-3 flex-nowrap min-w-max">
          <div className="min-w-45 flex flex-col items-start gap-2 p-8 bg-white rounded-lg shadow-md ">
            <div className="flex items-center gap-1">
              <Check className="w-4 h-4 text-green-800" />
              <span className="text-xs uppercase text-gray-500">Payées</span>
            </div>
            <p className="text-3xl text-zinc-700 font-bold font-title">500€ </p>
            <p className="text-sm text-zinc-500">(5 factures payées)</p>
          </div>

          <div className="min-w-45 flex flex-col items-start gap-2 p-8 bg-white rounded-lg shadow-md">
            <div className="flex items-center gap-1">
              <CirclePlusIcon className="w-4 h-4 text-yellow-800" />
              <span className="text-xs uppercase text-gray-500">En attente</span>
            </div>
            <p className="text-3xl text-zinc-700 font-bold font-title">500€ </p>
            <p className="text-sm text-zinc-500">(5 factures impayées)</p>
          </div>

          <div className="min-w-45 flex flex-col items-start gap-2 p-8 bg-white rounded-lg shadow-md">
            <div className="flex items-center gap-1">
              <AlertTriangle className="w-4 h-4 text-red-800" />
              <span className="text-xs uppercase text-gray-500">En retard</span>
            </div>
            <p className="text-3xl text-zinc-700 font-bold font-title">500€ </p>
            <p className="text-sm text-zinc-500">(5 factures en retard)</p>
          </div>

          <div className="min-w-45 flex flex-col items-start gap-2 p-8 bg-white rounded-lg shadow-md">
            <div className="flex items-center gap-1">
              <File className="w-4 h-4 text-gray-500" />
              <span className="text-xs uppercase text-gray-500">Brouillons</span>
            </div>
            <p className="text-3xl text-zinc-700 font-bold font-title">500€ </p>
            <p className="text-sm text-zinc-500">(5 factures brouillons)</p>
          </div>

          <div className="min-w-45 flex flex-col items-start gap-2 p-8 bg-white rounded-lg shadow-md">
            <div className="flex items-center gap-1">
              <ChartLine className="w-4 h-4 text-indigo-800" />
              <span className="text-xs uppercase text-gray-500">Économies</span>
            </div>
            <p className="text-3xl text-zinc-700 font-bold font-title">145€</p>
            <p className="text-sm text-zinc-500">(Ce mois-ci)</p>
          </div>
        </div>
      </div>
      {activeCompany?.status === 'CLOSED' && (
        <div className="mt-4 rounded-lg border border-red-100 bg-red-50/70 p-4 text-sm text-zinc-700">
          Cette entreprise est fermée : les factures existantes restent consultables, mais aucune nouvelle facture ne peut être créée.
        </div>
      )}

      <EstimatesInvoicesTable type="invoices" invoices={invoices} currentDate={currentDate} canCreate={activeCompany?.status !== 'CLOSED'} />
    </div>
  )
}

export default invoices
