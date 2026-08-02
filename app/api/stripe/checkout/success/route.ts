import { NextResponse } from "next/server";
import Stripe from "stripe";
import {
  getOrderForUserById,
  getOrdersForUser,
  saveOrderForUser,
} from "@/src/lib/order-repository";
import {
  DATABASE_AUTH_COOKIE,
  resolveDatabaseSession,
} from "@/src/lib/database-session";
import type { AccountOrder } from "@/src/types/account";

function getCookieValue(
  cookieHeader: string | null,
  name: string,
): string | undefined {
  if (!cookieHeader) return undefined;

  for (const part of cookieHeader.split(";")) {
    const trimmed = part.trim();
    const separator = trimmed.indexOf("=");

    if (separator !== -1 && trimmed.slice(0, separator) === name) {
      return trimmed.slice(separator + 1);
    }
  }

  return undefined;
}

function parseOrderPayload(
  rawOrderPayload: string | undefined,
): AccountOrder | null {
  if (!rawOrderPayload) return null;

  try {
    const parsed = JSON.parse(rawOrderPayload) as AccountOrder;

    if (
      !parsed.id ||
      !Array.isArray(parsed.items) ||
      typeof parsed.total !== "number"
    ) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const token = getCookieValue(
    request.headers.get("cookie"),
    DATABASE_AUTH_COOKIE,
  );
  const authSession = await resolveDatabaseSession(token);

  if (!authSession) {
    return NextResponse.json(
      { error: "Authentication required." },
      { status: 401 },
    );
  }

  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get("session_id");

  if (!sessionId) {
    return NextResponse.json(
      { error: "Missing checkout session id." },
      { status: 400 },
    );
  }

  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

  if (!stripeSecretKey) {
    return NextResponse.json({
      ok: true,
      demo: true,
      message:
        "Stripe is not configured; checkout is still complete in demo mode.",
    });
  }

  const stripe = new Stripe(stripeSecretKey);
  const stripeSession =
    await stripe.checkout.sessions.retrieve(sessionId);

  if (stripeSession.payment_status !== "paid") {
    return NextResponse.json(
      { error: "Checkout is still pending payment." },
      { status: 402 },
    );
  }

  const metadata = stripeSession.metadata ?? {};
  const profileId = metadata.profileId;
  const orderPayload = parseOrderPayload(metadata.orderPayload);

  if (!profileId || !orderPayload) {
    return NextResponse.json(
      { error: "Checkout session is missing order metadata." },
      { status: 400 },
    );
  }

  if (profileId !== authSession.userId) {
    return NextResponse.json(
      { error: "Checkout session belongs to a different account." },
      { status: 403 },
    );
  }

  const existingOrder = await getOrderForUserById(
    profileId,
    orderPayload.id,
  );

  if (!existingOrder && process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json(
      {
        ok: true,
        pending: true,
        orderId: orderPayload.id,
        message:
          "Payment is confirmed. Waiting for secure fulfillment.",
      },
      { status: 202 },
    );
  }

  const orders = existingOrder
    ? await getOrdersForUser(profileId)
    : await saveOrderForUser(profileId, orderPayload);

  const purchasedBookIds = Array.from(
    new Set(
      orders.flatMap((order) =>
        order.items.map((item) => item.id),
      ),
    ),
  );

  const fulfilledOrder = existingOrder ?? orderPayload;

  return NextResponse.json({
    ok: true,
    orderId: fulfilledOrder.id,
    order: fulfilledOrder,
    purchasedBookIds,
  });
}