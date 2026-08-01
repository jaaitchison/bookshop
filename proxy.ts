import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { DATABASE_AUTH_COOKIE } from "@/src/lib/database-session";
import {
  getRequiredRoleForPath,
  isProtectedPath,
} from "@/src/lib/route-protection";

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
    "/admin/:path*",
    "/studio/:path*",
    "/library/:path*",
    "/checkout/:path*",
  ],
};