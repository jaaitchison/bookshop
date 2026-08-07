import { NextResponse } from "next/server";
import type { AccountRole } from "@/src/types/account";
import {
  DATABASE_AUTH_COOKIE,
  resolveDatabaseSession,
} from "@/src/lib/database-session";
import { userHasRole } from "@/src/lib/role-authorization";

function getCookieValue(
  cookieHeader: string | null,
  name: string,
): string | undefined {
  if (!cookieHeader) {
    return undefined;
  }

  for (const part of cookieHeader.split(";")) {
    const trimmed = part.trim();
    const separator = trimmed.indexOf("=");

    if (separator === -1) {
      continue;
    }

    const key = trimmed.slice(0, separator);
    const value = trimmed.slice(separator + 1);

    if (key === name) {
      return value;
    }
  }

  return undefined;
}

function parseRequiredRole(value: string | null): AccountRole | null {
  if (value === "reader" || value === "writer" || value === "admin") {
    return value;
  }

  return null;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const requiredRole = parseRequiredRole(searchParams.get("role"));

  if (!requiredRole) {
    return NextResponse.json(
      {
        authorized: false,
        error: "A valid role is required.",
      },
      { status: 400 },
    );
  }

  const token = getCookieValue(
    request.headers.get("cookie"),
    DATABASE_AUTH_COOKIE,
  );

  const session = await resolveDatabaseSession(token);

  if (!session) {
    return NextResponse.json(
      {
        authenticated: false,
        authorized: false,
      },
      { status: 401 },
    );
  }

  const authorized = await userHasRole(
    session.userId,
    requiredRole,
  );

  if (!authorized) {
    return NextResponse.json(
      {
        authenticated: true,
        authorized: false,
      },
      { status: 403 },
    );
  }

  return NextResponse.json({
    authenticated: true,
    authorized: true,
    userId: session.userId,
  });
}