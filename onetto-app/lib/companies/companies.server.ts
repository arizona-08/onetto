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

export function getMyCompaniesServer() {
  return apiServer<CompaniesResponse>("api/companies");
}

export function getCurrentInvoiceFeeSummaryServer() {
  return apiServer<InvoiceFeeSummary>("api/companies/invoice-fees/summary");
}
