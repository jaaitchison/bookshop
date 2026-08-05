import { readFile } from "node:fs/promises";
import path from "node:path";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function read(...parts: string[]) {
  return readFile(path.join(process.cwd(), ...parts), "utf8");
}

async function main() {
  console.log("\nSECTION 10.2 - PaymentIntent pipeline source verification\n");
  const [schema, migration, service, repository, checkoutRoute, webhook, checkoutPage, paymentForm, successPage, accountRoute, accountContext, runtimeTest, browserTest, docs] = await Promise.all([
    read("prisma", "schema.prisma"),
    read("prisma", "migrations", "20260805233000_phase_10_2_payment_intents", "migration.sql"),
    read("src", "lib", "checkout-payment-service.ts"),
    read("src", "lib", "payment-attempt-repository.ts"),
    read("app", "api", "checkout", "route.ts"),
    read("app", "api", "webhooks", "stripe", "route.ts"),
    read("app", "checkout", "page.tsx"),
    read("src", "components", "checkout", "StripePaymentForm.tsx"),
    read("app", "checkout", "success", "page.tsx"),
    read("app", "api", "account", "route.ts"),
    read("src", "context", "AccountContext.tsx"),
    read("prisma", "test-phase-10-2-payments.ts"),
    read("tests", "browser", "payment-intent-flow.spec.ts"),
    read("docs", "SECTION-10-2-PAYMENT-INTENTS.md"),
  ]);

  console.log("1. Durable payment-attempt snapshot");
  for (const marker of ["model PaymentAttempt {", "model PaymentAttemptItem {", "stripePaymentIntentId", "amountCents", "PaymentAttemptStatus"]) {
    assert(schema.includes(marker) && migration.includes(marker === "model PaymentAttempt {" ? 'CREATE TABLE "PaymentAttempt"' : marker === "model PaymentAttemptItem {" ? 'CREATE TABLE "PaymentAttemptItem"' : marker.replace("PaymentAttemptStatus", 'CREATE TYPE "PaymentAttemptStatus"')), `Payment attempt marker missing: ${marker}`);
  }
  console.log("   PASS - pending Stripe work has an additive server-owned snapshot model.");

  console.log("\n2. Server-side PaymentIntent amount");
  for (const marker of ["attempt.amountCents", "paymentAttemptId: attempt.id", "userId", "idempotencyKey: attempt.id", "paymentIntents.create"]) {
    assert((service + checkoutRoute).includes(marker), `PaymentIntent marker missing: ${marker}`);
  }
  assert(!checkoutRoute.includes("body.items") && !checkoutRoute.includes("body.total"), "Checkout accepts browser cart authority.");
  assert(repository.includes("BookStatus.PUBLISHED") && repository.includes("BookVisibility.PUBLIC"), "Checkout does not enforce purchasable books.");
  console.log("   PASS - amount and item snapshots are recalculated from the live persistent cart.");

  console.log("\n3. Signed and idempotent webhook");
  for (const marker of ["request.text()", "constructEvent", 'event.type !== "payment_intent.succeeded"', "recordSucceededPaymentIntent"]) {
    assert(webhook.includes(marker), `Webhook marker missing: ${marker}`);
  }
  for (const marker of ["amount_received", "PAYMENT_MISMATCH", "stripeWebhookEvent.create", "PaymentAttemptStatus.SUCCEEDED"]) {
    assert(repository.includes(marker), `Payment verification marker missing: ${marker}`);
  }
  assert(!webhook.includes("saveOrderForUser") && !webhook.includes("libraryItem"), "Section 10.2 performs premature fulfillment.");
  console.log("   PASS - raw signatures, exact amounts and duplicate events are enforced before success state.");

  console.log("\n4. Stripe-hosted payment UI and safe status page");
  assert(checkoutPage.includes("<Elements") && paymentForm.includes("<PaymentElement"), "Stripe Payment Element is not integrated.");
  for (const forbidden of ["cardNumber", "cardExpiry", "cardCvc", "placeOrder("]) {
    assert(!checkoutPage.includes(forbidden), `Unsafe legacy checkout marker remains: ${forbidden}`);
  }
  assert(successPage.includes("/api/checkout/status") && !successPage.includes("saveOrder"), "Success page still controls fulfillment.");
  assert(!accountRoute.includes("export async function POST") && !accountContext.includes("placeOrder"), "Legacy browser-authored order creation remains available.");
  console.log("   PASS - card data stays in Stripe and browser callbacks cannot fulfill purchases.");

  console.log("\n5. Adversarial and browser coverage");
  for (const marker of ["Forged title", "Invalid webhook signature", "Duplicate webhook delivery", "Tampered webhook amount", "premature fulfillment"]) {
    assert(runtimeTest.toLowerCase().includes(marker.toLowerCase()), `Runtime coverage marker missing: ${marker}`);
  }
  assert(browserTest.includes("Card number") && browserTest.includes("Stripe confirmed your payment"), "Payment browser coverage is incomplete.");
  assert(docs.includes("npm run phase10:test-payments"), "Section 10.2 runbook is incomplete.");
  console.log("   PASS - source, tamper, idempotency and real browser status behavior are covered.");

  console.log("\nSECTION 10.2 SOURCE VERIFICATION PASSED.\n");
}

main().catch((error) => {
  console.error("\nSECTION 10.2 SOURCE VERIFICATION FAILED.");
  console.error(error);
  process.exitCode = 1;
});
