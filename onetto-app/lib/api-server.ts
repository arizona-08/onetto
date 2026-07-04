import { cookies } from "next/headers";
import { ApiError, buildApiUrl, parseJsonResponse, toApiError } from "./api";
import { err, ok, Result } from "../shared/result";

function isPublicAuthPath(path: string): boolean {
  const normalizedPath = path.replace(/^\/+/, "");

  return [
    "api/auth/login",
    "api/auth/refresh",
    "api/users/create",
  ].includes(normalizedPath);
}

function isRefreshPath(path: string): boolean {
  return path.replace(/^\/+/, "") === "api/auth/refresh";
}

function getAccessToken(payload: unknown): string | undefined {
  if (!payload || typeof payload !== "object") {
    return undefined;
  }

  const tokenPayload = payload as { accessToken?: unknown; access_token?: unknown };
  const token = tokenPayload.accessToken ?? tokenPayload.access_token;

  return typeof token === "string" ? token : undefined;
}

async function getServerHeaders(options?: RequestInit, accessToken?: string): Promise<Headers> {
  const fetchHeaders = new Headers(options?.headers || {});
  const cookieStore = await cookies();
  const allCookiesString = cookieStore.toString();

  if (allCookiesString) {
    fetchHeaders.set("Cookie", allCookiesString);
  }

  if (accessToken) {
    fetchHeaders.set("Authorization", `Bearer ${accessToken}`);
  }

  return fetchHeaders;
}

async function fetchServerApi(path: string, options?: RequestInit, accessToken?: string) {
  const res = await fetch(buildApiUrl(process.env.INTERNAL_API_URL, path), {
    ...options,
    credentials: "include",
    headers: await getServerHeaders(options, accessToken),
  });
  const payload = await parseJsonResponse(res);

  return { res, payload };
}

async function refreshServerAccessToken(): Promise<string | undefined> {
  const { res, payload } = await fetchServerApi("/api/auth/refresh", {
    method: "POST",
  });

  if (!res.ok) {
    return undefined;
  }

  return getAccessToken(payload);
}

export async function apiServer<T, E = ApiError>(path: string, options?: RequestInit): Promise<Result<T, E>> {
  try {
    let { res, payload } = await fetchServerApi(path, options);
    const shouldRefresh = res.status === 401 && !isPublicAuthPath(path) && !isRefreshPath(path);

    if (shouldRefresh) {
      const accessToken = await refreshServerAccessToken();

      if (accessToken) {
        ({ res, payload } = await fetchServerApi(path, options, accessToken));
      }
    }

    if (!res.ok) {
      return err<E>(toApiError(payload, res.status) as E);
    }

    return ok<T>(payload as T);
  } catch (error) {
    return err<E>({
      statusCode: 0,
      message: "Unable to reach the API.",
      error: error instanceof Error ? error.message : undefined,
      details: error,
    } as E);
  }
}
