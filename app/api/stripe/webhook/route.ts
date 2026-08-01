import { NextResponse } from "next/server";
import Stripe from "stripe";
import {
  hasStripeEventBeenProcessed,
  markStripeEventProcessed,
  saveAccountOrder,
} from "@/src/lib/account-store";
import { getPrismaClient } from "@/src/lib/prisma";
import type { AccountOrder } from "@/src/types/account";

const STRIPE_EVENT_TYPES = new Set<Stripe.Event.Type>([
  "checkout.session.completed",
  "checkout.session.async_payment_succeeded",
]);

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

export async function POST(request: Request) {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripeSecretKey || !stripeWebhookSecret) {
    return NextResponse.json(
      { error: "Stripe webhook is not configured." },
      { status: 500 },
    );
  }

  const stripeSignature = request.headers.get("stripe-signature");

  if (!stripeSignature) {
    return NextResponse.json(
      { error: "Missing Stripe signature." },
      { status: 400 },
    );
  }

  const payload = await request.text();
  const stripe = new Stripe(stripeSecretKey);

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      payload,
      stripeSignature,
      stripeWebhookSecret,
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Invalid Stripe webhook payload.";

    return NextResponse.json({ error: message }, { status: 400 });
  }

  if (!STRIPE_EVENT_TYPES.has(event.type)) {
    return NextResponse.json({
      received: true,
      ignored: true,
    });
  }

  if (await hasStripeEventBeenProcessed(event.id)) {
    return NextResponse.json({
      received: true,
      duplicate: true,
    });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  const metadata = session.metadata ?? {};
  const profileId = metadata.profileId;
  const order = parseOrderPayload(metadata.orderPayload);

  if (!profileId || !order) {
    return NextResponse.json(
      { error: "Checkout metadata is incomplete." },
      { status: 400 },
    );
  }

  const prisma = getPrismaClient();

  if (!prisma) {
    return NextResponse.json(
      { error: "Database unavailable." },
      { status: 503 },
    );
  }

  const userExists = await prisma.user.findUnique({
    where: { id: profileId },
    select: { id: true },
  });

  if (!userExists) {
    return NextResponse.json(
      { error: "Account for checkout could not be found." },
      { status: 404 },
    );
  }

  if (session.payment_status !== "paid") {
    return NextResponse.json(
      { error: "Checkout session is not paid yet." },
      { status: 402 },
    );
  }

  await saveAccountOrder(profileId, order);
  await markStripeEventProcessed(event.id);

  return NextResponse.json({
    received: true,
    fulfilled: true,
    orderId: order.id,
  });
}