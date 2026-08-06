import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { DATABASE_AUTH_COOKIE } from "@/src/lib/database-session";
import {
  getRequiredRoleForPath,
  isProtectedPath,
} from "@/src/lib/route-protection";
import { applyCorsHeaders, isRequestOriginAllowed } from "@/src/lib/cors-policy";

function redirectToAuth(
  request: NextRequest,
  pathname: string,
): NextResponse {
  const redirectUrl = request.nextUrl.clone();
  redirectUrl.pathname = "/auth";
  redirectUrl.search = "";
  redirectUrl.searchParams.set("redirect", pathname);
  return NextResponse.redirect(redirectUrl);
}

function redirectDenied(
  request: NextRequest,
  requiredRole: string,
): NextResponse {
  const redirectUrl = request.nextUrl.clone();
  redirectUrl.pathname = "/account";
  redirectUrl.search = "";
  redirectUrl.searchParams.set("denied", requiredRole);
  return NextResponse.redirect(redirectUrl);
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/api/")) {
    if (!isRequestOriginAllowed(request)) {
      return NextResponse.json({ error: "Origin is not allowed." }, { status: 403 });
    }
    const response = request.method === "OPTIONS"
      ? new NextResponse(null, { status: 204 })
      : NextResponse.next();
    applyCorsHeaders(response.headers, request);
    return response;
  }

  if (!isProtectedPath(pathname)) {
    return NextResponse.next();
  }

  const requiredRole = getRequiredRoleForPath(pathname);

  if (!requiredRole) {
    return NextResponse.next();
  }

  const token = request.cookies.get(DATABASE_AUTH_COOKIE)?.value;

  if (!token) {
    return redirectToAuth(request, pathname);
  }

  const authorizeUrl = new URL("/api/auth/authorize", request.url);
  authorizeUrl.searchParams.set("role", requiredRole);

  try {
    const authorization = await fetch(authorizeUrl, {
      method: "GET",
      headers: {
        cookie: request.headers.get("cookie") ?? "",
      },
      cache: "no-store",
    });

    if (authorization.status === 401) {
      return redirectToAuth(request, pathname);
    }

    if (authorization.status === 403) {
      return redirectDenied(request, requiredRole);
    }

    if (!authorization.ok) {
      return redirectToAuth(request, pathname);
    }

    return NextResponse.next();
  } catch {
    return redirectToAuth(request, pathname);
  }
}

export const config = {
  matcher: [
    "/api/:path*",
    "/admin/:path*",
    "/studio/:path*",
    "/library/:path*",
    "/account/:path*",
    "/checkout/:path*",
  ],
};
