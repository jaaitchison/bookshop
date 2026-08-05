import "dotenv/config";
import { RoleKey } from "../src/generated/prisma/client";
import {
  DELETE as deleteCart,
  GET as getCart,
  PATCH as patchCart,
  POST as postCart,
} from "../app/api/cart/route";
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

function request(
  method: "GET" | "POST" | "PATCH" | "DELETE",
  token?: string,
  body?: Record<string, unknown>,
) {
  const headers = new Headers();
  if (token) headers.set("cookie", `${DATABASE_AUTH_COOKIE}=${token}`);
  if (body) headers.set("content-type", "application/json");
  return new Request("http://localhost/api/cart", {
    method,
    headers,
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}

type CartPayload = {
  error?: string;
  cart?: {
    count: number;
    subtotal: number;
    items: Array<{
      quantity: number;
      unitPrice: number;
      lineTotal: number;
      book: { id: string; title: string; price: number };
    }>;
  };
};

async function payload(response: Response) {
  return response.json() as Promise<CartPayload>;
}

async function main() {
  const prisma = getPrismaClient();
  assert(prisma, "Prisma client unavailable.");
  const readerRole = await prisma.role.findUnique({ where: { key: RoleKey.READER } });
  assert(readerRole, "Reader role is missing.");

  const suffix = Date.now().toString(36);
  const user = await prisma.user.create({
    data: {
      email: `section-10-1-${suffix}@example.test`,
      username: `cart-${suffix}`.slice(0, 32),
      name: "Section 10.1 Cart Reader",
      passwordHash: await hashPassword("Section10CartPassword"),
      roles: { create: { roleId: readerRole.id } },
    },
  });
  const [publicBook, privateBook] = await Promise.all([
    prisma.book.create({
      data: {
        slug: `section-10-1-public-${suffix}`,
        title: "Server Priced Cart Book",
        authorDisplayName: "Commerce Author",
        price: 12.34,
        status: "PUBLISHED",
        visibility: "PUBLIC",
      },
    }),
    prisma.book.create({
      data: {
        slug: `section-10-1-private-${suffix}`,
        title: "Unavailable Cart Book",
        authorDisplayName: "Hidden Author",
        price: 1,
        status: "PUBLISHED",
        visibility: "PRIVATE",
      },
    }),
  ]);
  const session = await createDatabaseSession(user.id);

  try {
    console.log("\nSECTION 10.1 - Persistent cart runtime verification\n");

    console.log("1. Reader session boundary");
    const anonymous = await getCart(request("GET"));
    assert(anonymous.status === 401, "Anonymous cart access was allowed.");
    console.log("   PASS - cart access requires a live Reader database session.");

    console.log("\n2. Server-authoritative add and price");
    const addResponse = await postCart(request("POST", session.token, {
      bookId: publicBook.slug,
      quantity: 2,
      price: 0.01,
      title: "Forged browser title",
    }));
    const added = await payload(addResponse);
    assert(addResponse.status === 200, added.error ?? "Cart add failed.");
    assert(added.cart?.items[0]?.unitPrice === 12.34, "Browser price replaced the database price.");
    assert(added.cart?.items[0]?.book.title === publicBook.title, "Browser title replaced database metadata.");
    assert(added.cart?.subtotal === 24.68, "Server subtotal is incorrect.");
    const stored = await prisma.cartItem.findFirst({ where: { cart: { userId: user.id } } });
    assert(stored?.bookId === publicBook.id && stored.quantity === 2, "Canonical Cart/CartItem records were not saved.");
    console.log("   PASS - only bookId/quantity are accepted and PostgreSQL supplies price and metadata.");

    console.log("\n3. Live repricing and availability");
    await prisma.book.update({ where: { id: publicBook.id }, data: { price: 15.5 } });
    const liveResponse = await getCart(request("GET", session.token));
    const live = await payload(liveResponse);
    assert(live.cart?.items[0]?.unitPrice === 15.5 && live.cart.subtotal === 31, "Cart did not reprice from PostgreSQL.");
    const privateResponse = await postCart(request("POST", session.token, { bookId: privateBook.slug }));
    assert(privateResponse.status === 400, "A private book was added to the cart.");
    console.log("   PASS - reads use current database prices and reject non-public books.");

    console.log("\n4. Quantity validation and update");
    const invalid = await patchCart(request("PATCH", session.token, { bookId: publicBook.slug, quantity: 0 }));
    assert(invalid.status === 400, "Invalid quantity was accepted.");
    const updatedResponse = await patchCart(request("PATCH", session.token, { bookId: publicBook.slug, quantity: 3 }));
    const updated = await payload(updatedResponse);
    assert(updated.cart?.count === 3 && updated.cart.subtotal === 46.5, "Quantity update was not persisted/repriced.");
    console.log("   PASS - quantities are bounded whole numbers and update persistent state.");

    console.log("\n5. Remove and clear");
    const removedResponse = await deleteCart(request("DELETE", session.token, { bookId: publicBook.slug }));
    const removed = await payload(removedResponse);
    assert(removed.cart?.items.length === 0, "Single-item removal failed.");
    await postCart(request("POST", session.token, { bookId: publicBook.slug }));
    const clearedResponse = await deleteCart(request("DELETE", session.token, {}));
    const cleared = await payload(clearedResponse);
    assert(cleared.cart?.items.length === 0, "Cart clear failed.");
    console.log("   PASS - item removal and whole-cart clearing persist in PostgreSQL.");

    console.log("\nSECTION 10.1 PASSED.\n");
  } finally {
    await revokeDatabaseSession(session.token);
    await prisma.user.delete({ where: { id: user.id } }).catch(() => undefined);
    await prisma.book.deleteMany({ where: { id: { in: [publicBook.id, privateBook.id] } } });
    await prisma.$disconnect();
    console.log("Temporary Section 10.1 records cleaned up.");
  }
}

main().catch((error) => {
  console.error("\nSECTION 10.1 FAILED.");
  console.error(error);
  process.exitCode = 1;
});

