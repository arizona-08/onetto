import { ApiError, apiClient } from "../api";
import { LoginDto } from "./dtos/login.dto";
import { RegisterDto } from "./dtos/register.dto";
import { LoginResponse } from "./responses/login.response";
import { RegisterResponse } from "./responses/register.response";
import { Result } from "../result";

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

export async function refreshToken() {
  
}