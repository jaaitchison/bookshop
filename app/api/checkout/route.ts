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
import { EnvironmentValidationError, validateServerEnvironment } from "@/src/lib/environment";
import { createDigitalContentConsent } from "@/src/lib/legal-policy";

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

  let stripeSecretKey: string;
  try {
    stripeSecretKey = validateServerEnvironment(undefined, { requirePayments: true }).STRIPE_SECRET_KEY!;
  } catch (error) {
    if (!(error instanceof EnvironmentValidationError)) throw error;
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
    const consent = createDigitalContentConsent(
      body && typeof body === "object" ? (body as { digitalContentConsent?: unknown }).digitalContentConsent : false,
    );
    const checkout = await initializeCheckoutPayment(
      session.userId,
      shipping,
      consent,
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
    if (error instanceof Error && error.message === "Digital content consent is required before payment.") {
      return NextResponse.json({ error: error.message, code: "CONSENT_REQUIRED" }, { status: 400 });
    }
    console.error("PaymentIntent initialization failed", error);
    return NextResponse.json({ error: "Secure payment initialization failed." }, { status: 502 });
  }
  };
}

export const POST = createCheckoutPostHandler();
