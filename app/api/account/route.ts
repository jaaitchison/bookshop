import { NextResponse } from "next/server";
import {
  getOrdersForUser,
  saveOrderForUser,
} from "@/src/lib/order-repository";
import {
  DATABASE_AUTH_COOKIE,
  resolveDatabaseSession,
} from "@/src/lib/database-session";
import { userHasRole } from "@/src/lib/role-authorization";
import type { AccountOrder } from "@/src/types/account";

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
  const { searchParams } = new URL(request.url);
  const profileId = searchParams.get("profileId");

  if (!profileId) {
    return NextResponse.json(
      {
        error:
          "The legacy users endpoint has been removed. Supply profileId for order history.",
      },
      { status: 400 },
    );
  }

  const session = await getRequestSession(request);

  if (!session) {
    return NextResponse.json(
      { error: "Authentication required." },
      { status: 401 },
    );
  }

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

export async function POST(request: Request) {
  const session = await getRequestSession(request);

  if (!session) {
    return NextResponse.json(
      { error: "Authentication required." },
      { status: 401 },
    );
  }

  const body = (await request.json()) as {
    type?: "place-order";
    profileId?: string;
    order?: AccountOrder;
  };

  if (
    body.type !== "place-order" ||
    !body.profileId ||
    !body.order
  ) {
    return NextResponse.json(
      {
        error:
          "Legacy account/auth actions have been removed. Only place-order remains temporarily supported.",
      },
      { status: 400 },
    );
  }

  if (session.userId !== body.profileId) {
    return NextResponse.json(
      { error: "Unauthorized to place an order for this account." },
      { status: 403 },
    );
  }

  const orders = await saveOrderForUser(
    body.profileId,
    body.order,
  );

  return NextResponse.json({ orders });
}