import { NextResponse } from "next/server";
import { getOrdersForUser } from "@/src/lib/order-repository";
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

    if (trimmed.slice(0, separator) === name) {
      return trimmed.slice(separator + 1);
    }
  }

  return undefined;
}

async function getRequestSession(request: Request) {
  const token = getCookieValue(
    request.headers.get("cookie"),
    DATABASE_AUTH_COOKIE,
  );

  return resolveDatabaseSession(token);
}

export async function GET(request: Request) {
  const session = await getRequestSession(request);

  if (!session) {
    return NextResponse.json(
      { error: "Authentication required." },
      { status: 401 },
    );
  }

  const { searchParams } = new URL(request.url);
  const profileId = searchParams.get("profileId") ?? session.userId;

  const canRead =
    session.userId === profileId ||
    (await userHasRole(session.userId, "admin"));

  if (!canRead) {
    return NextResponse.json(
      { error: "Unauthorized to access this account order history." },
      { status: 403 },
    );
  }

  const orders = await getOrdersForUser(profileId);
  return NextResponse.json({ orders });
}
