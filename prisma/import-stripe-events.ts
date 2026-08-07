import "dotenv/config";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { getPrismaClient } from "../src/lib/prisma";

type LegacyStore = {
  ordersByProfile?: Record<string, unknown[]>;
  stripeProcessedEvents?: string[];
  [key: string]: unknown;
};

async function main() {
  const prisma = getPrismaClient();
  if (!prisma) throw new Error("Prisma client unavailable.");

  const storePath = path.join(process.cwd(), "data", "account-store.json");
  const store = JSON.parse(await readFile(storePath, "utf8")) as LegacyStore;
  const legacyEvents = Array.isArray(store.stripeProcessedEvents)
    ? Array.from(new Set(store.stripeProcessedEvents))
    : [];

  console.log("");
  console.log("SECTION 6.3 Stripe event import");
  console.log("");
  console.log(`Legacy JSON event IDs: ${legacyEvents.length}`);

  for (const eventId of legacyEvents) {
    await prisma.stripeWebhookEvent.upsert({
      where: { eventId },
      update: {},
      create: { eventId, eventType: "legacy-import" },
    });
  }

  const importedCount = legacyEvents.length
    ? await prisma.stripeWebhookEvent.count({
        where: { eventId: { in: legacyEvents } },
      })
    : 0;

  if (importedCount !== legacyEvents.length) {
    throw new Error(
      `Only ${importedCount} of ${legacyEvents.length} legacy Stripe event IDs were imported. JSON was not changed.`,
    );
  }

  delete store.stripeProcessedEvents;

  await writeFile(
    storePath,
    JSON.stringify(store, null, 2) + "\n",
    "utf8",
  );

  const totalDatabaseEvents = await prisma.stripeWebhookEvent.count();

  console.log(`Imported legacy IDs: ${importedCount}`);
  console.log(`StripeWebhookEvent rows now: ${totalDatabaseEvents}`);
  console.log("stripeProcessedEvents removed from account-store.json after successful verification.");
  console.log("");
  console.log("SECTION 6.3 import complete.");
}

main()
  .catch((error) => {
    console.error("");
    console.error("SECTION 6.3 import FAILED.");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    const prisma = getPrismaClient();
    if (prisma) await prisma.$disconnect();
  });