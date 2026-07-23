import { apiServer } from "../api-server";
import { Company } from "./dtos/create-company.dto";

export type CompaniesResponse = {
  companies: Company[];
  activeCompanyId: string | null;
};

export function getMyCompaniesServer() {
  return apiServer<CompaniesResponse>("api/companies");
}
