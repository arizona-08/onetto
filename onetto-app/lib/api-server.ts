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

function getAccessTokenFromSetCookie(response: Response): string | undefined {
  const setCookie = response.headers.get("set-cookie");
  const match = setCookie?.match(/(?:^|,\s*)access_token=([^;]+)/);

  return match?.[1];
}

async function getServerHeaders(options?: RequestInit, accessToken?: string): Promise<Headers> {
  const fetchHeaders = new Headers(options?.headers || {});

  if (accessToken) {
    fetchHeaders.set("Authorization", `Bearer ${accessToken}`);
  }

  if (fetchHeaders.has("Cookie")) {
    return fetchHeaders;
  }

  const cookieStore = await cookies();
  const allCookiesString = cookieStore.toString();

  if (allCookiesString) {
    fetchHeaders.set("Cookie", allCookiesString);
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

async function refreshServerAccessToken(options?: RequestInit): Promise<string | undefined> {
  const { res } = await fetchServerApi("/api/auth/refresh", {
    method: "POST",
    headers: options?.headers,
  });

  if (!res.ok) {
    return undefined;
  }

  return getAccessTokenFromSetCookie(res);
}

export async function apiServer<T, E = ApiError>(path: string, options?: RequestInit): Promise<Result<T, E>> {
  try {
    let { res, payload } = await fetchServerApi(path, options);
    const shouldRefresh = res.status === 401 && !isPublicAuthPath(path) && !isRefreshPath(path);

    if (shouldRefresh) {
      const accessToken = await refreshServerAccessToken(options);

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
