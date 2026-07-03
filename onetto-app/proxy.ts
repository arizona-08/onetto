import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const AUTH_ROUTE_PREFIX = "/auth";
const ME_ENDPOINT = "/api/auth/me";

function isAuthRoute(pathname: string): boolean {
  return pathname === AUTH_ROUTE_PREFIX || pathname.startsWith(`${AUTH_ROUTE_PREFIX}/`);
}

function buildApiUrl(path: string): string {
  const baseUrl = process.env.INTERNAL_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "";
  const normalizedBaseUrl = baseUrl.replace(/\/$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  return `${normalizedBaseUrl}${normalizedPath}`;
}

export async function proxy(request: NextRequest) {
  if (isAuthRoute(request.nextUrl.pathname)) {
    return NextResponse.next();
  }

  let response: Response;

  try {
    response = await fetch(buildApiUrl(ME_ENDPOINT), {
      cache: "no-store",
      headers: {
        Cookie: request.headers.get("cookie") ?? "",
      },
    });
  } catch {
    return NextResponse.next();
  }

  if (response.status !== 401) {
    return NextResponse.next();
  }

  const loginUrl = new URL("/auth/login", request.url);
  loginUrl.searchParams.set("next", `${request.nextUrl.pathname}${request.nextUrl.search}`);

  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
