import type { AppUserRole } from "./login.response";

export interface MeResponse {
  id: string;
  firstname: string;
  lastname: string;
  email: string;
  role: string;
  emailVerifiedAt: string | null;
  appUserRole: AppUserRole;
}
