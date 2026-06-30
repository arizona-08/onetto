import { cookies } from "next/headers";
import { ApiError, buildApiUrl, parseJsonResponse, toApiError } from "./api";
import { err, ok, Result } from "./result";

export async function apiServer<T, E = ApiError>(path: string, options?: RequestInit): Promise<Result<T, E>> {
  try {
    const fetchHeaders = new Headers(options?.headers || {});
    const cookieStore = await cookies();
    const allCookiesString = cookieStore.toString();
    fetchHeaders.set("Cookie", allCookiesString);

    const res = await fetch(buildApiUrl(process.env.INTERNAL_API_URL, path), {
      ...options,
      credentials: "include",
      headers: fetchHeaders,
    });

    const payload = await parseJsonResponse(res);

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
