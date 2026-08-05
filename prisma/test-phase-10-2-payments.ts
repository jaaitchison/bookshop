import "dotenv/config";
import Stripe from "stripe";
import { RoleKey } from "../src/generated/prisma/client";
import { createCheckoutPostHandler } from "../app/api/checkout/route";
import { GET as getCheckoutStatus } from "../app/api/checkout/status/route";
import { POST as postStripeWebhook } from "../app/api/webhooks/stripe/route";
import {
  createDatabaseSession,
  DATABASE_AUTH_COOKIE,
  revokeDatabaseSession,
} from "../src/lib/database-session";
import { hashPassword } from "../src/lib/password";
import { getPrismaClient } from "../src/lib/prisma";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function authenticatedRequest(
  url: string,
  method: "GET" | "POST",
  token?: string,
  body?: Record<string, unknown>,
) {
  const headers = new Headers();
  if (token) headers.set("cookie", `${DATABASE_AUTH_COOKIE}=${token}`);
  if (body) headers.set("content-type", "application/json");
  return new Request(url, {
    method,
    headers,
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}

function signedWebhookRequest(payload: string, secret: string) {
  const signature = Stripe.webhooks.generateTestHeaderString({ payload, secret });
  return new Request("http://localhost/api/webhooks/stripe", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "stripe-signature": signature,
    },
    body: payload,
  });
}

async function main() {
  const prisma = getPrismaClient();
  assert(prisma, "Prisma client unavailable.");
  const readerRole = await prisma.role.findUnique({ where: { key: RoleKey.READER } });
  assert(readerRole, "Reader role is missing.");

  const suffix = Date.now().toString(36);
  const user = await prisma.user.create({
    data: {
      email: `section-10-2-${suffix}@example.test`,
      username: `payment-${suffix}`.slice(0, 32),
      name: "Section 10.2 Payment Reader",
      passwordHash: await hashPassword("Section10PaymentPassword"),
      roles: { create: { roleId: readerRole.id } },
    },
  });
  const book = await prisma.book.create({
    data: {
      slug: `section-10-2-${suffix}`,
      title: "Database Priced Payment Book",
      authorDisplayName: "Payment Author",
      price: 10.25,
      status: "PUBLISHED",
      visibility: "PUBLIC",
    },
  });
  await prisma.cart.create({
    data: {
      userId: user.id,
      items: { create: { bookId: book.id, quantity: 2 } },
    },
  });
  const session = await createDatabaseSession(user.id);
  const eventIds = [`evt_section_10_2_${suffix}`, `evt_section_10_2_mismatch_${suffix}`];
  const originalSecret = process.env.STRIPE_SECRET_KEY;
  const originalPublishable = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  const originalWebhook = process.env.STRIPE_WEBHOOK_SECRET;
  process.env.STRIPE_SECRET_KEY = "sk_test_section_10_2";
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = "pk_test_section_10_2";
  process.env.STRIPE_WEBHOOK_SECRET = `whsec_section_10_2_${suffix}`;

  const captured: Array<{ params: Record<string, unknown>; idempotencyKey: string }> = [];
  let intentNumber = 0;
  const checkoutPost = createCheckoutPostHandler(() => ({
    async create(params, options) {
      intentNumber += 1;
      captured.push({
        params: params as unknown as Record<string, unknown>,
        idempotencyKey: options.idempotencyKey,
      });
      return {
        id: `pi_section_10_2_${suffix}_${intentNumber}`,
        client_secret: `pi_section_10_2_${suffix}_${intentNumber}_secret_test`,
      };
    },
  }));

  try {
    console.log("\nSECTION 10.2 - PaymentIntent runtime verification\n");

    console.log("1. Authenticated checkout boundary");
    const anonymous = await checkoutPost(authenticatedRequest("http://localhost/api/checkout", "POST", undefined, {}));
    assert(anonymous.status === 401, "Anonymous checkout initialization was allowed.");
    console.log("   PASS - PaymentIntent creation requires a live Reader session.");

    console.log("\n2. Server-side price recalculation and minimal metadata");
    const response = await checkoutPost(authenticatedRequest(
      "http://localhost/api/checkout",
      "POST",
      session.token,
      {
        items: [{ id: book.slug, price: 0.01, title: "Forged title", quantity: 99 }],
        total: 0.99,
        shipping: {
          name: "Payment Reader",
          email: user.email,
          address: "10 Secure Street",
          city: "London",
          postcode: "SW1A 1AA",
        },
      },
    ));
    const initialized = await response.json() as {
      checkout?: { paymentAttemptId: string; paymentIntentId: string; amountCents: number };
      error?: string;
    };
    assert(response.status === 200 && initialized.checkout, initialized.error ?? "Checkout initialization failed.");
    const firstCapture = captured[0];
    assert(firstCapture.params.amount === 2050, "Browser price or quantity affected the PaymentIntent amount.");
    assert(initialized.checkout.amountCents === 2050, "API returned a non-authoritative amount.");
    const metadata = firstCapture.params.metadata as Record<string, string>;
    assert(
      Object.keys(metadata).sort().join(",") === "paymentAttemptId,userId",
      "PaymentIntent metadata contains unnecessary or sensitive data.",
    );
    assert(firstCapture.idempotencyKey === initialized.checkout.paymentAttemptId, "Durable attempt ID is not the Stripe idempotency key.");
    const attempt = await prisma.paymentAttempt.findUnique({
      where: { id: initialized.checkout.paymentAttemptId },
      include: { items: true },
    });
    assert(attempt?.items[0]?.bookId === book.id && attempt.items[0].priceCents === 1025, "Server payment snapshot is incorrect.");
    console.log("   PASS - Stripe amount and snapshot use only current PostgreSQL cart data.");

    console.log("\n3. Signed success webhook and exact verification");
    const succeededEvent = JSON.stringify({
      id: eventIds[0],
      object: "event",
      type: "payment_intent.succeeded",
      data: {
        object: {
          id: initialized.checkout.paymentIntentId,
          object: "payment_intent",
          amount: 2050,
          amount_received: 2050,
          currency: "usd",
          metadata,
        },
      },
    });
    const invalidSignature = await postStripeWebhook(new Request("http://localhost/api/webhooks/stripe", {
      method: "POST",
      headers: { "stripe-signature": "invalid" },
      body: succeededEvent,
    }));
    assert(invalidSignature.status === 400, "Invalid webhook signature was accepted.");
    const webhook = await postStripeWebhook(signedWebhookRequest(succeededEvent, process.env.STRIPE_WEBHOOK_SECRET));
    const webhookPayload = await webhook.json() as { duplicate?: boolean; fulfillmentPending?: boolean };
    assert(webhook.status === 200 && webhookPayload.fulfillmentPending, "Signed success webhook was not processed.");
    const succeededAttempt = await prisma.paymentAttempt.findUnique({ where: { id: attempt.id } });
    assert(succeededAttempt?.status === "SUCCEEDED", "Verified PaymentIntent did not mark its attempt succeeded.");
    console.log("   PASS - raw-body signature, identity, amount, currency and receipt amount are verified.");

    console.log("\n4. Webhook idempotency and no premature fulfillment");
    const duplicate = await postStripeWebhook(signedWebhookRequest(succeededEvent, process.env.STRIPE_WEBHOOK_SECRET));
    const duplicatePayload = await duplicate.json() as { duplicate?: boolean };
    assert(duplicatePayload.duplicate === true, "Duplicate webhook delivery was not detected.");
    assert(await prisma.stripeWebhookEvent.count({ where: { eventId: eventIds[0] } }) === 1, "Duplicate webhook event row was created.");
    assert(await prisma.order.count({ where: { userId: user.id } }) === 0, "Section 10.2 created an Order before fulfillment.");
    assert(await prisma.libraryItem.count({ where: { userId: user.id } }) === 0, "Section 10.2 granted library access early.");
    console.log("   PASS - duplicate delivery is idempotent and fulfillment remains reserved for Section 10.3.");

    console.log("\n5. Tamper rejection and owner-scoped status");
    const secondResponse = await checkoutPost(authenticatedRequest(
      "http://localhost/api/checkout",
      "POST",
      session.token,
      {
        shipping: {
          name: "Payment Reader",
          email: user.email,
          address: "10 Secure Street",
          city: "London",
          postcode: "SW1A 1AA",
        },
      },
    ));
    const second = await secondResponse.json() as { checkout: { paymentAttemptId: string; paymentIntentId: string } };
    const secondAttempt = await prisma.paymentAttempt.findUnique({ where: { id: second.checkout.paymentAttemptId } });
    assert(secondAttempt, "Second payment attempt is missing.");
    const mismatchedEvent = JSON.stringify({
      id: eventIds[1],
      object: "event",
      type: "payment_intent.succeeded",
      data: {
        object: {
          id: second.checkout.paymentIntentId,
          object: "payment_intent",
          amount: 1,
          amount_received: 1,
          currency: "usd",
          metadata: { paymentAttemptId: secondAttempt.id, userId: user.id },
        },
      },
    });
    const mismatch = await postStripeWebhook(signedWebhookRequest(mismatchedEvent, process.env.STRIPE_WEBHOOK_SECRET));
    assert(mismatch.status === 400, "Tampered webhook amount was accepted.");
    const ownerStatus = await getCheckoutStatus(authenticatedRequest(
      `http://localhost/api/checkout/status?payment_intent=${initialized.checkout.paymentIntentId}`,
      "GET",
      session.token,
    ));
    const anonymousStatus = await getCheckoutStatus(authenticatedRequest(
      `http://localhost/api/checkout/status?payment_intent=${initialized.checkout.paymentIntentId}`,
      "GET",
    ));
    assert(ownerStatus.status === 200 && anonymousStatus.status === 401, "Payment status ownership boundary failed.");
    console.log("   PASS - tampered amounts fail and payment status remains account-scoped.");

    console.log("\nSECTION 10.2 PASSED.\n");
  } finally {
    process.env.STRIPE_SECRET_KEY = originalSecret;
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = originalPublishable;
    process.env.STRIPE_WEBHOOK_SECRET = originalWebhook;
    await revokeDatabaseSession(session.token);
    await prisma.stripeWebhookEvent.deleteMany({ where: { eventId: { in: eventIds } } });
    await prisma.user.delete({ where: { id: user.id } }).catch(() => undefined);
    await prisma.book.delete({ where: { id: book.id } }).catch(() => undefined);
    await prisma.$disconnect();
    console.log("Temporary Section 10.2 records cleaned up.");
  }
}

main().catch((error) => {
  console.error("\nSECTION 10.2 FAILED.");
  console.error(error);
  process.exitCode = 1;
});

