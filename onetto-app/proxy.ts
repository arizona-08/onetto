import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { apiServer } from "./lib/api-server";

const AUTH_ROUTE_PREFIX = "/auth";
const NEGOCIATIONS_ROUTE = "/negociations";
const PAYMENT_ROUTE_PREFIX = "/payment";
const ME_ENDPOINT = "/api/auth/me";

function isAuthRoute(pathname: string): boolean {
  return pathname === AUTH_ROUTE_PREFIX || pathname.startsWith(`${AUTH_ROUTE_PREFIX}/`);
}

function isPaymentRoute(pathname: string): boolean {
  return pathname === PAYMENT_ROUTE_PREFIX || pathname.startsWith(`${PAYMENT_ROUTE_PREFIX}/`);
}

export async function proxy(request: NextRequest) {
  if (
    isAuthRoute(request.nextUrl.pathname) ||
    isPaymentRoute(request.nextUrl.pathname) ||
    request.nextUrl.pathname === NEGOCIATIONS_ROUTE
  ) {
    return NextResponse.next();
  }

  const response = await apiServer<unknown>(ME_ENDPOINT, {
    cache: "no-store",
    headers: {
      Cookie: request.headers.get("cookie") ?? "",
    },
  });

  if (response.ok || response.error.statusCode !== 401) {
    return NextResponse.next();
  }

  const loginUrl = new URL("/auth/login", request.url);
  loginUrl.searchParams.set("next", `${request.nextUrl.pathname}${request.nextUrl.search}`);

  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
