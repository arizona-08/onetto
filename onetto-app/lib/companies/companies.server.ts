import { apiServer } from "../api-server";
import { Company } from "./dtos/create-company.dto";

export type CompaniesResponse = {
  companies: Company[];
  activeCompanyId: string | null;
};

export type InvoiceFeeSummary = {
  periodStart: string;
  totalAmountInCents: number;
  companies: Array<{
    companyId: string;
    companyName: string;
    paidInvoicesCount: number;
    amountInCents: number;
  }>;
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
};

export function getMyCompaniesServer() {
  return apiServer<CompaniesResponse>("api/companies");
}

export function getCurrentInvoiceFeeSummaryServer() {
  return apiServer<InvoiceFeeSummary>("api/companies/invoice-fees/summary");
}

export function getActiveCompanyServicesServer() {
  return apiServer<CompanyService[]>("api/companies/active/services");
}

export function getActiveCompanyClientsServer() {
  return apiServer<CompanyClient[]>("api/companies/active/clients");
}
