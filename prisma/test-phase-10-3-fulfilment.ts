import "dotenv/config";
import { RoleKey } from "../src/generated/prisma/client";
import { deliverOrderConfirmation } from "../src/lib/order-confirmation-service";
import {
  attachStripePaymentIntent,
  createPaymentAttemptForUser,
  recordSucceededPaymentIntent,
} from "../src/lib/payment-attempt-repository";
import { createDigitalContentConsent } from "../src/lib/legal-policy";
import { getPrismaClient } from "../src/lib/prisma";
import { getWriterSalesAnalytics } from "../src/lib/writer-sales-repository";
import { hashPassword } from "../src/lib/password";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function main() {
  const prisma = getPrismaClient();
  assert(prisma, "Prisma client unavailable.");
  const [readerRole, writerRole] = await Promise.all([
    prisma.role.findUnique({ where: { key: RoleKey.READER } }),
    prisma.role.findUnique({ where: { key: RoleKey.WRITER } }),
  ]);
  assert(readerRole && writerRole, "Reader and Writer roles are required.");

  const suffix = Date.now().toString(36);
  const passwordHash = await hashPassword("FulfilmentTestPassword2026");
  const writer = await prisma.user.create({
    data: {
      email: `fulfilment-writer-${suffix}@example.test`,
      username: `fulfilment-writer-${suffix}`.slice(0, 32),
      name: "Fulfilment Writer",
      passwordHash,
      activeRole: RoleKey.WRITER,
      roles: { createMany: { data: [{ roleId: readerRole.id }, { roleId: writerRole.id }] } },
    },
  });
  const reader = await prisma.user.create({
    data: {
      email: `fulfilment-reader-${suffix}@example.test`,
      username: `fulfilment-reader-${suffix}`.slice(0, 32),
      name: "Fulfilment Reader",
      passwordHash,
      roles: { create: { roleId: readerRole.id } },
    },
  });
  const books = await Promise.all([
    prisma.book.create({
      data: {
        slug: `fulfilment-one-${suffix}`,
        title: "Fulfilment Book One",
        authorId: writer.id,
        authorDisplayName: writer.name,
        price: 10.25,
        status: "PUBLISHED",
        visibility: "PUBLIC",
      },
    }),
    prisma.book.create({
      data: {
        slug: `fulfilment-two-${suffix}`,
        title: "Fulfilment Book Two",
        authorId: writer.id,
        authorDisplayName: writer.name,
        price: 4.5,
        status: "PUBLISHED",
        visibility: "PUBLIC",
      },
    }),
    prisma.book.create({
      data: {
        slug: `fulfilment-later-${suffix}`,
        title: "Added After Checkout",
        authorId: writer.id,
        authorDisplayName: writer.name,
        price: 7,
        status: "PUBLISHED",
        visibility: "PUBLIC",
      },
    }),
  ]);
  const cart = await prisma.cart.create({
    data: {
      userId: reader.id,
      items: {
        create: [
          { bookId: books[0].id, quantity: 2 },
          { bookId: books[1].id, quantity: 1 },
        ],
      },
    },
  });
  const attempt = await createPaymentAttemptForUser(reader.id, {
    name: reader.name,
    email: reader.email,
    address: "10 Reliable Street",
    city: "London",
    postcode: "SW1A 1AA",
  }, createDigitalContentConsent(true));
  const paymentIntentId = `pi_section_10_3_${suffix}`;
  await attachStripePaymentIntent(attempt.id, paymentIntentId);
  await prisma.cartItem.update({
    where: { cartId_bookId: { cartId: cart.id, bookId: books[0].id } },
    data: { quantity: 3 },
  });
  await prisma.cartItem.create({
    data: { cartId: cart.id, bookId: books[2].id, quantity: 1 },
  });

  const intent = {
    id: paymentIntentId,
    amount: 2500,
    amount_received: 2500,
    currency: "gbp",
    metadata: { paymentAttemptId: attempt.id, userId: reader.id },
  };
  const eventIds = [`evt_section_10_3_${suffix}`, `evt_section_10_3_retry_${suffix}`];

  try {
    console.log("\nSECTION 10.3 - Order fulfilment runtime verification\n");

    console.log("1. Atomic order, item and library creation");
    const result = await recordSucceededPaymentIntent(eventIds[0], "payment_intent.succeeded", intent);
    assert(!result.duplicate && result.orderId, "First verified event did not fulfil an order.");
    const order = await prisma.order.findUnique({
      where: { id: result.orderId },
      include: { items: true, confirmation: true },
    });
    assert(order?.paymentAttemptId === attempt.id, "Order is not bound to its immutable payment attempt.");
    assert(order.items.length === 2 && order.total.toNumber() === 25, "Order snapshots or GBP total are incorrect.");
    assert(await prisma.libraryItem.count({ where: { userId: reader.id } }) === 2, "Purchased books were not granted.");
    assert(order.confirmation?.status === "PENDING", "Confirmation was not durably queued.");
    console.log("   PASS - one transaction records the order, snapshots, grants and confirmation outbox.");

    console.log("\n2. Cart reconciliation preserves later shopping");
    const remaining = await prisma.cartItem.findMany({ where: { cartId: cart.id }, orderBy: { bookId: "asc" } });
    const remainingByBook = new Map(remaining.map((item) => [item.bookId, item.quantity]));
    assert(remainingByBook.get(books[0].id) === 1, "Quantity added after checkout was erased.");
    assert(!remainingByBook.has(books[1].id), "Purchased quantity was not removed.");
    assert(remainingByBook.get(books[2].id) === 1, "A later cart addition was erased.");
    console.log("   PASS - only quantities present in the paid snapshot are consumed.");

    console.log("\n3. Webhook and payment idempotency");
    const duplicate = await recordSucceededPaymentIntent(eventIds[0], "payment_intent.succeeded", intent);
    const replay = await recordSucceededPaymentIntent(eventIds[1], "payment_intent.succeeded", intent);
    assert(duplicate.duplicate && replay.duplicate, "Webhook retries were not recognised.");
    assert(await prisma.order.count({ where: { paymentAttemptId: attempt.id } }) === 1, "A retry created another order.");
    assert(await prisma.libraryItem.count({ where: { userId: reader.id } }) === 2, "A retry duplicated library grants.");
    console.log("   PASS - same-event and new-event retries converge on the original order.");

    console.log("\n4. Transactional confirmation delivery");
    const delivered = await deliverOrderConfirmation(order.id, async (message) => {
      assert(message.to === reader.email && message.html.includes("£25.00"), "Confirmation content is incorrect.");
      return `resend_test_${suffix}`;
    });
    assert(delivered.status === "sent", "Confirmation transport was not recorded as sent.");
    const confirmation = await prisma.orderConfirmation.findUnique({ where: { orderId: order.id } });
    assert(confirmation?.status === "SENT" && confirmation.attemptCount === 1, "Confirmation delivery state is incorrect.");
    console.log("   PASS - queued confirmation is claimed once and records its provider receipt.");

    console.log("\n5. Writer sales receive fulfilled purchases");
    const sales = await getWriterSalesAnalytics(writer.id);
    assert(sales.totalBooksSold === 3 && sales.totalRevenue === 25, "Writer sales did not reflect the fulfilled order.");
    console.log("   PASS - Writer Studio sales totals are fed by the trusted order items.");

    console.log("\nSECTION 10.3 PASSED.\n");
  } finally {
    await prisma.user.delete({ where: { id: reader.id } }).catch(() => undefined);
    await prisma.book.deleteMany({ where: { id: { in: books.map((book) => book.id) } } }).catch(() => undefined);
    await prisma.user.delete({ where: { id: writer.id } }).catch(() => undefined);
    await prisma.$disconnect();
    console.log("Temporary Section 10.3 records cleaned up.");
  }
}

main().catch((error) => {
  console.error("\nSECTION 10.3 FAILED.");
  console.error(error);
  process.exitCode = 1;
});
