import { err, ok, Result} from "./result";

export type ApiError = {
  statusCode: number;
  message: string | string[];
  error?: string;
  details?: unknown;
};

async function parseJsonResponse(res: Response): Promise<unknown> {
  const text = await res.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function buildApiUrl(baseUrl: string | undefined, path: string): string {
  const base = baseUrl?.replace(/\/$/, "") ?? "";
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  return `${base}${normalizedPath}`;
}

function getClientHeaders(options?: RequestInit): Headers {
  const headers = new Headers(options?.headers || {});

  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  return headers;
}

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

function toApiError(payload: unknown, statusCode: number): ApiError {
  if (payload && typeof payload === "object") {
    const errorPayload = payload as Partial<ApiError>;

    return {
      statusCode: typeof errorPayload.statusCode === "number" ? errorPayload.statusCode : statusCode,
      message: errorPayload.message ?? `API error ${statusCode}`,
      error: errorPayload.error,
      details: payload,
    };
  }

  return {
    statusCode,
    message: typeof payload === "string" ? payload : `API error ${statusCode}`,
  };
}

async function fetchClientApi(path: string, options?: RequestInit) {
  const headers = getClientHeaders(options);

  const res = await fetch(buildApiUrl(process.env.NEXT_PUBLIC_API_URL, path), {
    credentials: "include",
    ...options,
    headers,
  });
  const payload = await parseJsonResponse(res);

  return { res, payload };
}

async function refreshClientAuthCookies(): Promise<boolean> {
  const { res } = await fetchClientApi("/api/auth/refresh", {
    method: "POST",
  });

  if (!res.ok) {
    return false;
  }

  return true;
}

export async function apiClient<T, E = ApiError>(path: string, options?: RequestInit): Promise<Result<T, E>> {
  try {
    let { res, payload } = await fetchClientApi(path, options);
    const shouldRefresh = res.status === 401 && !isPublicAuthPath(path) && !isRefreshPath(path);

    if (shouldRefresh) {
      const didRefresh = await refreshClientAuthCookies();

      if (didRefresh) {
        ({ res, payload } = await fetchClientApi(path, options));
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

export { buildApiUrl, parseJsonResponse, toApiError };
