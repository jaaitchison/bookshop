import "dotenv/config";
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { AccountOrder } from "../src/types/account";
import {
  getOrderForUserById,
  getOrdersForUser,
  saveOrderForUser,
} from "../src/lib/order-repository";
import { getPrismaClient } from "../src/lib/prisma";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function main() {
  const prisma = getPrismaClient();
  assert(prisma, "Prisma client unavailable.");

  const suffix = Date.now().toString(36);
  const user = await prisma.user.findUnique({
    where: { email: "reader@bookshop.local" },
  });

  assert(
    user,
    "reader@bookshop.local is missing. Run npm run auth:seed-dev-users.",
  );

  const book = await prisma.book.findFirst({
    orderBy: { createdAt: "asc" },
  });

  assert(book, "No PostgreSQL book exists for the order test.");

  const order: AccountOrder = {
    id: `section-6-2-${suffix}`,
    orderedAt: new Date().toISOString(),
    total: Number(book.price.toString()),
    status: "Processing",
    items: [
      {
        id: book.id,
        title: book.title,
        author: book.authorDisplayName,
        price: Number(book.price.toString()),
        quantity: 1,
      },
    ],
    shippingName: "Section 6.2 Test",
    shippingEmail: user.email,
    shippingAddress: "1 Test Street",
    shippingCity: "Edinburgh",
    shippingZip: "EH1 1AA",
  };

  console.log("");
  console.log("SECTION 6.2 PostgreSQL order repository verification");
  console.log("");

  try {
    console.log("1. Save order");
    await saveOrderForUser(user.id, order);

    const dbOrder = await prisma.order.findUnique({
      where: { id: order.id },
      include: { items: true },
    });

    assert(dbOrder, "Order was not written to PostgreSQL.");
    assert(dbOrder.userId === user.id, "Order owner is incorrect.");
    assert(dbOrder.items.length === 1, "OrderItem was not created.");
    assert(dbOrder.items[0].bookId === book.id, "OrderItem book relation is incorrect.");

    console.log("   PASS - Order and OrderItem written to PostgreSQL.");

    console.log("");
    console.log("2. Repository read");

    const resolved = await getOrderForUserById(user.id, order.id);
    assert(resolved, "Repository could not read the saved order.");
    assert(resolved.id === order.id, "Repository returned wrong order.");
    assert(resolved.items[0].title === book.title, "Snapshot title mismatch.");

    console.log("   PASS - PostgreSQL-first repository returns AccountOrder shape.");

    console.log("");
    console.log("3. User isolation");

    const writer = await prisma.user.findUnique({
      where: { email: "writer@bookshop.local" },
    });
    assert(writer, "Writer dev user missing.");

    const leaked = await getOrderForUserById(writer.id, order.id);
    assert(!leaked, "Order leaked to another user.");

    console.log("   PASS - order lookup is user-isolated.");

    console.log("");
    console.log("4. JSON mirror");

    const store = JSON.parse(
      await readFile(
        path.join(process.cwd(), "data", "account-store.json"),
        "utf8",
      ),
    ) as {
      ordersByProfile?: Record<string, AccountOrder[]>;
    };

    const mirrored = (store.ordersByProfile?.[user.id] ?? []).find(
      (candidate) => candidate.id === order.id,
    );
    assert(mirrored, "JSON compatibility mirror was not written.");

    console.log("   PASS - JSON compatibility mirror remains available.");

    console.log("");
    console.log("5. List read");

    const orders = await getOrdersForUser(user.id);
    assert(
      orders.some((candidate) => candidate.id === order.id),
      "Saved order missing from repository list.",
    );

    console.log("   PASS - database order appears in user order list.");
    console.log("");
    console.log("SECTION 6.2 PASSED.");
  } finally {
    await prisma.order.deleteMany({
      where: { id: order.id },
    });

    // Remove only this test order from JSON mirror.
    const storePath = path.join(
      process.cwd(),
      "data",
      "account-store.json",
    );
    const store = JSON.parse(
      await readFile(storePath, "utf8"),
    ) as {
      ordersByProfile?: Record<string, AccountOrder[]>;
      stripeProcessedEvents?: string[];
    };

    if (store.ordersByProfile?.[user.id]) {
      store.ordersByProfile[user.id] = store.ordersByProfile[user.id].filter(
        (candidate) => candidate.id !== order.id,
      );
    }

    const { writeFile } = await import("node:fs/promises");
    await writeFile(
      storePath,
      JSON.stringify(store, null, 2) + "\n",
      "utf8",
    );

    console.log("Temporary Section 6.2 test order cleaned up.");
  }
}

main()
  .catch((error) => {
    console.error("");
    console.error("SECTION 6.2 FAILED.");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    const prisma = getPrismaClient();
    if (prisma) {
      await prisma.$disconnect();
    }
  });