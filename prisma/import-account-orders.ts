import "dotenv/config";
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { AccountOrder } from "../src/types/account";
import { saveOrderForUser } from "../src/lib/order-repository";
import { getPrismaClient } from "../src/lib/prisma";

type Store = {
  ordersByProfile?: Record<string, AccountOrder[]>;
};

async function main() {
  const prisma = getPrismaClient();

  if (!prisma) {
    throw new Error("Prisma client unavailable.");
  }

  const store = JSON.parse(
    await readFile(
      path.join(process.cwd(), "data", "account-store.json"),
      "utf8",
    ),
  ) as Store;

  const entries = Object.entries(store.ordersByProfile ?? {});
  let sourceOrders = 0;
  let imported = 0;
  let skippedUnknownUser = 0;

  console.log("");
  console.log("SECTION 6.2 JSON order import");
  console.log("");

  for (const [userId, orders] of entries) {
    sourceOrders += orders.length;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true },
    });

    if (!user) {
      skippedUnknownUser += orders.length;
      console.log(
        `SKIP ${userId}: ${orders.length} order(s) have no matching PostgreSQL user.`,
      );
      continue;
    }

    for (const order of orders) {
      await saveOrderForUser(user.id, order);
      imported += 1;
    }
  }

  const databaseOrders = await prisma.order.count();
  const databaseItems = await prisma.orderItem.count();

  console.log("");
  console.log(`JSON source orders: ${sourceOrders}`);
  console.log(`Imported/mirrored: ${imported}`);
  console.log(`Skipped unknown-user orders: ${skippedUnknownUser}`);
  console.log(`PostgreSQL orders now: ${databaseOrders}`);
  console.log(`PostgreSQL order items now: ${databaseItems}`);
  console.log("");
  console.log("Import complete.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    const prisma = getPrismaClient();
    if (prisma) {
      await prisma.$disconnect();
    }
  });