import { apiClient, buildApiUrl } from "../api";
import { Company, CreateCompanyDto } from "./dtos/create-company.dto";

export type CompaniesResponse = {
  companies: Company[];
  activeCompanyId: string | null;
};

export type CompanyPlanAccess = {
  currentPlan: 'FREE' | 'STARTER' | 'PRO';
  features: {
    negotiation: boolean;
    instalments: boolean;
    advancedAnalytics: boolean;
    automaticReminders: boolean;
    cashflowForecast: boolean;
  };
  maxOwnedCompanies: number;
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

export function getActiveCompanyPlanAccess() {
  return apiClient<CompanyPlanAccess>('api/companies/active/plan-access');
}

export function createCompany(data: CreateCompanyDto) {
  return apiClient<{ success: true; company: Company }>("api/companies", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function startSuperPdpAuthorization(companyId: string) {
  return apiClient<{ url: string }>(
    `api/electronic-invoicing/superpdp/oauth/companies/${companyId}/authorize`,
    { method: 'GET' },
  );
}

export type SuperPdpConnectionStatus = {
  status: 'NOT_CONFIGURED' | 'PENDING_AUTHORIZATION' | 'VERIFYING' | 'ACTIVE' | 'ACTION_REQUIRED' | 'SUSPENDED';
  connectedAt: string | null;
  lastError: string | null;
} | null;

export function getSuperPdpConnectionStatus(companyId: string) {
  return apiClient<SuperPdpConnectionStatus>(
    `api/electronic-invoicing/superpdp/oauth/companies/${companyId}/status`,
  );
}

export type SuperPdpEreportingOverview = {
  transactions: { data?: Array<{ id?: number | string; date?: string; category_code?: string; tax_exclusive_amount?: string; tax_total?: string; ppf_ereporting_id?: number | string }> };
  payments: { data?: Array<{ id?: number | string; date?: string; ppf_ereporting_id?: number | string }> };
  ereportings: { data?: Array<{ id?: number | string; status?: string; period_start?: string; period_end?: string }> };
  submissions: Array<{ id: string; status: string; providerReportId: string | null; createdAt: string; document?: { documentNumber: string | null; clientName: string } | null }>;
};

export function getSuperPdpEreportingOverview(companyId: string) {
  return apiClient<SuperPdpEreportingOverview>(
    `api/electronic-invoicing/superpdp/companies/${companyId}/ereporting-overview`,
  );
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
