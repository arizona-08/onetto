import { apiServer } from "../api-server";
import { Company } from "./dtos/create-company.dto";

export type CompaniesResponse = {
  companies: Company[];
  activeCompanyId: string | null;
};

export type CompanyPlanAccess = {
  currentPlan: 'FREE' | 'STARTER' | 'PRO';
  features: Record<string, boolean>;
  maxOwnedCompanies: number;
};

export type CompanyService = {
  id: string;
  companyId: string;
  name: string;
  description: string;
  unitPrice: number;
  unit: string;
  taxRate: number | null;
  category: string;
  wtPrice: number;
  totalPrice: number;
};

export type CompanyClient = {
  id: string;
  companyId: string;
  name: string;
  email: string;
  address: string;
  city: string;
  postalCode: string;
  country: string;
  clientType: 'BUSINESS' | 'CLIENT';
};

export function getMyCompaniesServer() {
  return apiServer<CompaniesResponse>("api/companies");
}

export function getActiveCompanyPlanAccessServer() {
  return apiServer<CompanyPlanAccess>('api/companies/active/plan-access');
}

export function getActiveCompanyServicesServer() {
  return apiServer<CompanyService[]>("api/companies/active/services");
}

export function getActiveCompanyClientsServer() {
  return apiServer<CompanyClient[]>("api/companies/active/clients");
}
