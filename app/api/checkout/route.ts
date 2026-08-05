import { NextResponse } from "next/server";
import Stripe from "stripe";
import {
  initializeCheckoutPayment,
  type PaymentIntentGateway,
} from "@/src/lib/checkout-payment-service";
import {
  CheckoutValidationError,
  normalizeCheckoutShipping,
} from "@/src/lib/payment-attempt-repository";
import { getRequestDatabaseSession } from "@/src/lib/request-auth";
import { userHasRole } from "@/src/lib/role-authorization";

type PaymentGatewayFactory = (secretKey: string) => PaymentIntentGateway;

export function createCheckoutPostHandler(
  createGateway: PaymentGatewayFactory = (secretKey) => {
    const stripe = new Stripe(secretKey);
    return { create: (params, options) => stripe.paymentIntents.create(params, options) };
  },
) {
  return async function checkoutPost(request: Request) {
  const session = await getRequestDatabaseSession(request);
  if (!session) {
    return NextResponse.json({ error: "Please sign in before checkout." }, { status: 401 });
  }
  if (!(await userHasRole(session.userId, "reader"))) {
    return NextResponse.json({ error: "Reader access is required." }, { status: 403 });
  }

  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  if (!stripeSecretKey || !stripePublishableKey) {
    return NextResponse.json(
      { error: "Secure payments are not configured for this environment.", code: "STRIPE_NOT_CONFIGURED" },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "A valid checkout payload is required." }, { status: 400 });
  }

  try {
    const shipping = normalizeCheckoutShipping(
      body && typeof body === "object" ? (body as { shipping?: unknown }).shipping : null,
    );
    const checkout = await initializeCheckoutPayment(
      session.userId,
      shipping,
      createGateway(stripeSecretKey),
    );

    return NextResponse.json(
      { checkout },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof CheckoutValidationError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: 400 });
    }
    console.error("PaymentIntent initialization failed", error);
    return NextResponse.json({ error: "Secure payment initialization failed." }, { status: 502 });
  }
  };
}

export const POST = createCheckoutPostHandler();
