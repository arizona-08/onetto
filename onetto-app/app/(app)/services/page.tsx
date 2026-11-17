import ServiceSection from "@/app/components/organisms/ServiceSection";
import {
  getActiveCompanyServicesServer,
  getMyCompaniesServer,
} from "@/lib/companies/companies.server";
import React from "react";
import { Wrench } from "lucide-react";

async function services() {
  const [companiesResponse, servicesResponse] = await Promise.all([
    getMyCompaniesServer(),
    getActiveCompanyServicesServer(),
  ]);
  const activeCompany = companiesResponse.ok
    ? companiesResponse.data.companies.find(
        (company) => company.id === companiesResponse.data.activeCompanyId,
      )
    : undefined;
  const canCreate = activeCompany?.status !== "CLOSED";
  const services = servicesResponse.ok
    ? servicesResponse.data.map((service) => ({
        id: service.id,
        name: service.name,
        description: service.description,
        unitPrice: service.unitPrice,
        unit: service.unit,
        taxRate: service.taxRate ?? 0,
        category: service.category,
        itemType: service.itemType,
      }))
    : [];

  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 py-7 sm:px-7 lg:px-9">
      <header className="flex items-start gap-4">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-ui-control bg-ui-primary-soft text-ui-primary">
          <Wrench className="h-6 w-6" aria-hidden="true" />
        </span>
        <div>
          <h1 className="font-title text-3xl font-semibold tracking-tight text-ui-text sm:text-4xl">
            Mon catalogue de services
          </h1>
          <p className="mt-1 text-sm text-ui-secondary sm:text-base">
            Gérez vos produits et services et gagnez du temps lors de la création de vos factures.
          </p>
        </div>
      </header>

      {!canCreate && (
        <p className="mt-4 rounded-lg border border-red-100 bg-red-50/70 p-4 text-sm text-zinc-700">
          Cette entreprise est fermée : aucun nouveau service ne peut être créé.
        </p>
      )}
      <ServiceSection services={services} canCreate={canCreate} />
    </div>
  );
}

export default services;
