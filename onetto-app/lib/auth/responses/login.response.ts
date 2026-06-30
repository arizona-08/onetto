export interface AuthUser {
  id: string;
  firstname: string;
  lastname: string;
  email: string;
  role: string;
}

export interface LoginResponse {
  message: string;
  user: AuthUser;
  access_token: string;
}
