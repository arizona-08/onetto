import { apiClient, buildApiUrl } from "../api";
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

export function getGoCardlessAuthorizationUrl(
  companyId: string,
  email: string,
) {
  // const query = new URLSearchParams({ companyId, email });

  console.log(
    `api/gocardless/oauth/authorize?companyId=${companyId}&email=${email}`,
  );

  return apiClient<{ url: string }>(
    `api/gocardless/oauth/authorize?companyId=${companyId}&email=${email}`,
  );
}

export function getGoCardlessVerificationStatusUrl(
  companyPaymentAccountId: string,
) {
  return buildApiUrl(
    process.env.NEXT_PUBLIC_API_URL,
    `api/gocardless/oauth/${encodeURIComponent(companyPaymentAccountId)}/verification-status`,
  );
}

export function getMyActiveCompany() {
  return apiClient<Company | null>("api/companies/active");
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
  return apiClient<{ success: true; activeCompanyId: string }>(
    `api/companies/${companyId}/select`,
    {
      method: "POST",
    },
  );
}

export function performOwnedCompanyAction(
  companyId: string,
  action: "reactivate" | "close",
  reason?: string,
) {
  return apiClient<{ success: true; activeCompanyId?: string }>(
    `api/companies/${companyId}/perform-owned-action?action=${action}`,
    {
      method: "PATCH",
      ...(reason ? { body: JSON.stringify({ reason }) } : {}),
    },
  );
}

export function performUserCompanyAction(
  companyId: string,
  action: "hide" | "unhide",
) {
  return apiClient<{ success: true }>(
    `api/companies/${companyId}/perform-user-action?action=${action}`,
    {
      method: "PATCH",
    },
  );
}

export function deleteCompany(companyId: string) {
  return apiClient<{ success: true }>(`api/companies/${companyId}`, {
    method: "DELETE",
  });
}
