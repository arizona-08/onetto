import { ApiError, apiClient } from "../api";
import { LoginDto } from "./dtos/login.dto";
import { RegisterDto } from "./dtos/register.dto";
import { LoginResponse } from "./responses/login.response";
import { RegisterResponse } from "./responses/register.response";
import { Result } from "../../shared/result";
import { LogoutResponse } from "./responses/logout.response";

export async function register(data: RegisterDto): Promise<Result<RegisterResponse, ApiError>> {
  return apiClient<RegisterResponse>("api/users/create", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function login(data: LoginDto): Promise<Result<LoginResponse, ApiError>> {
  return apiClient<LoginResponse>("api/auth/login", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

/** Refreshes the browser cookies before leaving Onetto for an OAuth provider. */
export async function refreshAuthenticationCookies(): Promise<Result<{ message: string }, ApiError>> {
  return apiClient<{ message: string }>("api/auth/refresh", {
    method: "POST",
  });
}

export async function confirmEmail(token: string): Promise<Result<{ message: string }, ApiError>> {
  return apiClient<{ message: string }>("api/auth/confirm-email", {
    method: "POST",
    body: JSON.stringify({ token }),
  });
}

export async function resendEmailVerification(email: string): Promise<Result<{ message: string }, ApiError>> {
  return apiClient<{ message: string }>("api/auth/resend-email-verification", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export async function requestPasswordReset(email: string): Promise<Result<{ message: string }, ApiError>> {
  return apiClient<{ message: string }>("api/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export async function resetPassword(
  token: string,
  password: string,
  confirmationPassword: string,
): Promise<Result<{ message: string }, ApiError>> {
  return apiClient<{ message: string }>("api/auth/reset-password", {
    method: "POST",
    body: JSON.stringify({ token, password, confirmationPassword }),
  });
}

export async function me(): Promise<Result<MeResponse, ApiError>> {
  return apiClient<MeResponse>("api/auth/me", {
    method: "GET",
  });
}

export async function logout(): Promise<Result<LogoutResponse, ApiError>>{
  return apiClient<LogoutResponse>("api/auth/logout", {
    method: "DELETE",
  });
}
