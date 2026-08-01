import { NextResponse } from "next/server";
import {
  DATABASE_AUTH_COOKIE,
  resolveDatabaseSession,
} from "@/src/lib/database-session";

function getCookieValue(cookieHeader: string | null, name: string): string | undefined {
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

export async function GET(request: Request) {
  const token = getCookieValue(
    request.headers.get("cookie"),
    DATABASE_AUTH_COOKIE,
  );

  const session = await resolveDatabaseSession(token);

  if (!session) {
    return NextResponse.json(
      {
        authenticated: false,
        profile: null,
      },
      { status: 401 },
    );
  }

  return NextResponse.json({
    authenticated: true,
    profile: session.profile,
    session: {
      expiresAt: session.expiresAt.toISOString(),
    },
  });
}