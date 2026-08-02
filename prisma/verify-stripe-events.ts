import "dotenv/config";
import { access } from "node:fs/promises";
import path from "node:path";
import {
  hasStripeWebhookEventBeenProcessed,
  markStripeWebhookEventProcessed,
} from "../src/lib/stripe-event-repository";
import { getPrismaClient } from "../src/lib/prisma";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function main() {
  const prisma = getPrismaClient();
  assert(prisma, "Prisma client unavailable.");

  const eventId = `evt_section_6_3_${Date.now()}`;

  console.log("");
  console.log("SECTION 6.3 Stripe event idempotency verification");
  console.log("");

  try {
    console.log("1. Unknown event");
    assert(
      !(await hasStripeWebhookEventBeenProcessed(eventId)),
      "Unknown event was incorrectly marked processed.",
    );
    console.log("   PASS - unknown event is not processed.");

    console.log("");
    console.log("2. Mark event");
    await markStripeWebhookEventProcessed(
      eventId,
      "checkout.session.completed",
    );
    assert(
      await hasStripeWebhookEventBeenProcessed(eventId),
      "Processed event was not found.",
    );
    console.log("   PASS - event is persisted in PostgreSQL.");

    console.log("");
    console.log("3. Duplicate mark");
    await markStripeWebhookEventProcessed(
      eventId,
      "checkout.session.completed",
    );
    const duplicateCount = await prisma.stripeWebhookEvent.count({
      where: { eventId },
    });
    assert(
      duplicateCount === 1,
      "Duplicate Stripe event created duplicate rows.",
    );
    console.log("   PASS - duplicate webhook delivery remains idempotent.");

    console.log("");
    console.log("4. JSON compatibility removal");
    const store = JSON.parse(
      await readFile(
        path.join(process.cwd(), "data", "account-store.json"),
        "utf8",
      ),
    ) as Record<string, unknown>;
    assert(
      !("stripeProcessedEvents" in store),
      "stripeProcessedEvents still exists in account-store.json.",
    );
    console.log("   PASS - JSON Stripe event tracking has been removed.");

    console.log("");
    console.log("SECTION 6.3 PASSED.");
  } finally {
    await prisma.stripeWebhookEvent.deleteMany({
      where: { eventId },
    });
    console.log("Temporary Section 6.3 Stripe event cleaned up.");
  }
}

main()
  .catch((error) => {
    console.error("");
    console.error("SECTION 6.3 FAILED.");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    const prisma = getPrismaClient();
    if (prisma) await prisma.$disconnect();
  });