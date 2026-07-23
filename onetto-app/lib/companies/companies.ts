import { apiClient } from "../api";
import { Company, CreateCompanyDto } from "./dtos/create-company.dto";

export type CompaniesResponse = {
  companies: Company[];
  activeCompanyId: string | null;
};

export function getMyCompanies() {
  return apiClient<CompaniesResponse>("api/companies");
}

export function getCompany(companyId: string) {
  return apiClient<Company>(`api/companies/${companyId}`);
}

export function createCompany(data: CreateCompanyDto) {
  return apiClient<{ success: true; company: Company }>("api/companies", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateCompany(companyId: string, data: CreateCompanyDto) {
  return apiClient<Company>(`api/companies/${companyId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function selectCompany(companyId: string) {
  return apiClient<{ success: true; activeCompanyId: string }>(`api/companies/${companyId}/select`, {
    method: "POST",
  });
}

export function deleteCompany(companyId: string) {
  return apiClient<{ success: true }>(`api/companies/${companyId}`, {
    method: "DELETE",
  });
}
