import { NextResponse } from "next/server";
import Stripe from "stripe";
import {
  PaymentVerificationError,
  recordSucceededPaymentIntent,
} from "@/src/lib/payment-attempt-repository";
import { EnvironmentValidationError, validateServerEnvironment } from "@/src/lib/environment";

export async function POST(request: Request) {
  let stripeSecretKey: string;
  let stripeWebhookSecret: string;
  try {
    const environment = validateServerEnvironment(undefined, { requirePayments: true });
    stripeSecretKey = environment.STRIPE_SECRET_KEY!;
    stripeWebhookSecret = environment.STRIPE_WEBHOOK_SECRET!;
    if (!stripeWebhookSecret) throw new EnvironmentValidationError(["STRIPE_WEBHOOK_SECRET is required"]);
  } catch (error) {
    if (!(error instanceof EnvironmentValidationError)) throw error;
    return NextResponse.json({ error: "Stripe webhook is not configured." }, { status: 503 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "Missing Stripe signature." }, { status: 400 });

  const rawBody = await request.text();
  const stripe = new Stripe(stripeSecretKey);
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, stripeWebhookSecret);
  } catch {
    return NextResponse.json({ error: "Invalid Stripe signature." }, { status: 400 });
  }

  if (event.type !== "payment_intent.succeeded") {
    return NextResponse.json({ received: true, ignored: true });
  }

  try {
    const intent = event.data.object as Stripe.PaymentIntent;
    const result = await recordSucceededPaymentIntent(event.id, event.type, {
      id: intent.id,
      amount: intent.amount,
      amount_received: intent.amount_received,
      currency: intent.currency,
      metadata: intent.metadata,
    });
    return NextResponse.json({
      received: true,
      duplicate: result.duplicate,
      paymentAttemptId: result.paymentAttemptId,
      orderId: result.orderId,
      libraryItemsGranted: result.libraryItemsGranted,
      confirmationStatus: result.confirmationStatus,
      fulfillmentPending: false,
    });
  } catch (error) {
    if (error instanceof PaymentVerificationError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: 400 });
    }
    console.error("Stripe webhook processing failed", error);
    return NextResponse.json({ error: "Stripe webhook processing failed." }, { status: 500 });
  }
}
