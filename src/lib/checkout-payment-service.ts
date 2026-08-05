import type { CheckoutInitialization, CheckoutShipping } from "@/src/types/checkout";
import {
  attachStripePaymentIntent,
  createPaymentAttemptForUser,
  markPaymentAttemptFailed,
} from "@/src/lib/payment-attempt-repository";

interface PaymentIntentRequest {
  amount: number;
  currency: "usd";
  automatic_payment_methods: {
    enabled: true;
  };
  description: string;
  receipt_email: string;
  metadata: {
    paymentAttemptId: string;
    userId: string;
  };
}

interface PaymentIntentResult {
  id: string;
  client_secret: string | null;
}

export interface PaymentIntentGateway {
  create(
    request: PaymentIntentRequest,
    options: { idempotencyKey: string },
  ): Promise<PaymentIntentResult>;
}

export async function initializeCheckoutPayment(
  userId: string,
  shipping: CheckoutShipping,
  gateway: PaymentIntentGateway,
): Promise<CheckoutInitialization> {
  const attempt = await createPaymentAttemptForUser(userId, shipping);

  try {
    const intent = await gateway.create(
      {
        amount: attempt.amountCents,
        currency: "usd",
        automatic_payment_methods: { enabled: true },
        description: `Bookshop purchase (${attempt.items.length} title${attempt.items.length === 1 ? "" : "s"})`,
        receipt_email: attempt.shippingEmail,
        metadata: {
          paymentAttemptId: attempt.id,
          userId,
        },
      },
      { idempotencyKey: attempt.id },
    );

    if (!intent.client_secret) {
      throw new Error("Stripe did not return a client secret.");
    }

    await attachStripePaymentIntent(attempt.id, intent.id);

    return {
      paymentAttemptId: attempt.id,
      paymentIntentId: intent.id,
      clientSecret: intent.client_secret,
      amount: attempt.amountCents / 100,
      amountCents: attempt.amountCents,
      currency: "usd",
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Stripe payment initialization failed.";
    await markPaymentAttemptFailed(attempt.id, message);
    throw error;
  }
}

