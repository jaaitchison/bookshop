import "dotenv/config";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import type { AccountOrder } from "../src/types/account";
import {
  getOrderForUserById,
  getOrdersForUser,
  saveOrderForUser,
} from "../src/lib/order-repository";
import { getPrismaClient } from "../src/lib/prisma";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

async function fileExists(relativePath: string) {
  try {
    await access(path.join(process.cwd(), relativePath));
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const prisma = getPrismaClient();
  assert(prisma, "Prisma client unavailable.");

  const suffix = Date.now().toString(36);
  const user = await prisma.user.findUnique({
    where: {
      email: "reader@bookshop.local",
    },
  });

  assert(
    user,
    "reader@bookshop.local is missing. Run npm run auth:seed-dev-users.",
  );

  const writer = await prisma.user.findUnique({
    where: {
      email: "writer@bookshop.local",
    },
  });

  assert(writer, "writer@bookshop.local is missing.");

  const book = await prisma.book.findFirst({
    orderBy: {
      createdAt: "asc",
    },
  });

  assert(book, "No PostgreSQL book exists for the order test.");

  const order: AccountOrder = {
    id: `section-6-4-${suffix}`,
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
    shippingName: "Section 6.4 Test",
    shippingEmail: user.email,
    shippingAddress: "1 Test Street",
    shippingCity: "Edinburgh",
    shippingZip: "EH1 1AA",
  };

  console.log("");
  console.log("SECTION 6.4 PostgreSQL-only order verification");
  console.log("");

  try {
    console.log("1. Save order");
    await saveOrderForUser(user.id, order);

    const dbOrder = await prisma.order.findUnique({
      where: {
        id: order.id,
      },
      include: {
        items: true,
      },
    });

    assert(dbOrder, "Order was not written to PostgreSQL.");
    assert(dbOrder.userId === user.id, "Order owner is incorrect.");
    assert(dbOrder.items.length === 1, "OrderItem was not created.");
    assert(
      dbOrder.items[0].bookId === book.id,
      "OrderItem book relation is incorrect.",
    );

    console.log(
      "   PASS - Order and OrderItem are persisted in PostgreSQL.",
    );

    console.log("");
    console.log("2. Repository read");

    const resolved = await getOrderForUserById(
      user.id,
      order.id,
    );

    assert(resolved, "Repository could not read the saved order.");
    assert(
      resolved.items[0].title === book.title,
      "Snapshot title mismatch.",
    );

    console.log(
      "   PASS - PostgreSQL repository returns AccountOrder shape.",
    );

    console.log("");
    console.log("3. User isolation");

    const leaked = await getOrderForUserById(
      writer.id,
      order.id,
    );

    assert(!leaked, "Order leaked to another user.");

    console.log(
      "   PASS - PostgreSQL order lookup is user-isolated.",
    );

    console.log("");
    console.log("4. List read");

    const orders = await getOrdersForUser(user.id);

    assert(
      orders.some((candidate) => candidate.id === order.id),
      "Saved order missing from PostgreSQL order list.",
    );

    console.log(
      "   PASS - database order appears in user order list.",
    );

    console.log("");
    console.log("5. JSON runtime removal");

    assert(
      !(await fileExists("data/account-store.json")),
      "data/account-store.json still exists as an active compatibility store.",
    );

    assert(
      !(await fileExists("src/lib/account-store.ts")),
      "src/lib/account-store.ts still exists.",
    );

    const repositorySource = await readFile(
      path.join(
        process.cwd(),
        "src",
        "lib",
        "order-repository.ts",
      ),
      "utf8",
    );

    assert(
      !repositorySource.includes("account-store"),
      "Order repository still imports the JSON compatibility layer.",
    );

    console.log(
      "   PASS - runtime JSON order compatibility layer is gone.",
    );

    console.log("");
    console.log("SECTION 6.4 PASSED.");
  } finally {
    await prisma.order.deleteMany({
      where: {
        id: order.id,
      },
    });

    console.log(
      "Temporary Section 6.4 PostgreSQL order cleaned up.",
    );
  }
}

main()
  .catch((error) => {
    console.error("");
    console.error("SECTION 6.4 FAILED.");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    const prisma = getPrismaClient();
    if (prisma) {
      await prisma.$disconnect();
    }
  });