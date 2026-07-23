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