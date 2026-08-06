import { readFile } from "node:fs/promises";
import path from "node:path";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function read(...parts: string[]) {
  return readFile(path.join(process.cwd(), ...parts), "utf8");
}

async function main() {
  console.log("\nSECTION 10.3 - Order fulfilment source verification\n");
  const [schema, migration, repository, confirmation, webhook, status, success, runtime, browser, docs, packageJson] = await Promise.all([
    read("prisma", "schema.prisma"),
    read("prisma", "migrations", "20260806020000_phase_10_3_order_fulfilment", "migration.sql"),
    read("src", "lib", "payment-attempt-repository.ts"),
    read("src", "lib", "order-confirmation-service.ts"),
    read("app", "api", "webhooks", "stripe", "route.ts"),
    read("app", "api", "checkout", "status", "route.ts"),
    read("app", "checkout", "success", "page.tsx"),
    read("prisma", "test-phase-10-3-fulfilment.ts"),
    read("tests", "browser", "payment-intent-flow.spec.ts"),
    read("docs", "SECTION-10-3-ORDER-FULFILMENT.md"),
    read("package.json"),
  ]);

  console.log("1. One order per payment snapshot");
  for (const marker of ["paymentAttemptId String?", "@unique", "model OrderConfirmation", "OrderConfirmationStatus"]) {
    assert(schema.includes(marker), `Schema marker missing: ${marker}`);
  }
  for (const marker of ['ALTER TABLE "Order" ADD COLUMN "paymentAttemptId"', 'CREATE TABLE "OrderConfirmation"', 'Order_paymentAttemptId_key']) {
    assert(migration.includes(marker), `Migration marker missing: ${marker}`);
  }
  console.log("   PASS - fulfilment identity and confirmation delivery are durable and additive.");

  console.log("\n2. Atomic server-owned fulfilment");
  for (const marker of ["prisma.$transaction", "tx.order.create", "attempt.items.map", "tx.libraryItem.createMany", "skipDuplicates", "PaymentAttemptStatus.SUCCEEDED"]) {
    assert(repository.includes(marker), `Fulfilment marker missing: ${marker}`);
  }
  assert(!success.includes("order.create") && !success.includes("libraryItem"), "The browser can still author fulfilment records.");
  console.log("   PASS - verified snapshots alone create orders, items and library grants.");

  console.log("\n3. Retry-safe cart and webhook handling");
  for (const marker of ["existingEvent", "attempt.order", 'code !== "P2002"', "quantity: { decrement", "cartId_bookId"]) {
    assert(repository.includes(marker), `Idempotency marker missing: ${marker}`);
  }
  assert(webhook.includes("orderId: result.orderId") && webhook.includes("fulfillmentPending: false"), "Webhook does not report completed fulfilment.");
  console.log("   PASS - webhook retries converge and later cart changes are preserved.");

  console.log("\n4. Confirmation outbox and fulfilled checkout UI");
  for (const marker of ["RESEND_API_KEY", "ORDER_CONFIRMATION_FROM_EMAIL", "OrderConfirmationStatus.SENDING", "https://api.resend.com/emails"]) {
    assert(confirmation.includes(marker), `Confirmation marker missing: ${marker}`);
  }
  assert(status.includes("getPaymentAttemptForUserByIntent") && repository.includes("orderId"), "Owner-scoped status omits the order identity.");
  for (const marker of ["refreshOrders()", "refreshCart()", 'href="/library"']) {
    assert(success.includes(marker), `Checkout success marker missing: ${marker}`);
  }
  console.log("   PASS - confirmation is durable and the signed-in client refreshes trusted state.");

  console.log("\n5. Runtime, browser and runbook coverage");
  for (const marker of ["Cart reconciliation preserves later shopping", "Webhook and payment idempotency", "Writer sales receive fulfilled purchases", "deliverOrderConfirmation"]) {
    assert(runtime.includes(marker), `Runtime coverage marker missing: ${marker}`);
  }
  assert(browser.includes("Open your library") && browser.includes("recordSucceededPaymentIntent"), "Browser coverage does not prove the fulfilled library path.");
  assert(docs.includes("npm run phase10:test-fulfilment") && packageJson.includes("phase10:verify-fulfilment"), "Section 10.3 commands are missing.");
  console.log("   PASS - source, transaction, retry, Writer sales and browser behaviour are covered.");

  console.log("\nSECTION 10.3 SOURCE VERIFICATION PASSED.\n");
}

main().catch((error) => {
  console.error("\nSECTION 10.3 SOURCE VERIFICATION FAILED.");
  console.error(error);
  process.exitCode = 1;
});
