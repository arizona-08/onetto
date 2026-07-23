import { AuthUser } from "./login.response";

export interface RegisterResponse {
  message: string;
  user: AuthUser;
}
