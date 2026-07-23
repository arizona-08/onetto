import { ApiError } from "../api";
import { apiServer } from "../api-server";
import { Result } from "../../shared/result";
import { RefreshTokenResponse } from "./responses/refresh-token.response";

export async function refreshToken(): Promise<Result<RefreshTokenResponse, ApiError>> {
  return apiServer<RefreshTokenResponse>("api/auth/refresh", {
    method: "POST",
  });
}