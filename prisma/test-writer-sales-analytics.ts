import "dotenv/config";
import { RoleKey } from "../src/generated/prisma/client";
import { GET as getStudioSales } from "../app/api/studio/sales/route";
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

function request(token?: string) {
  const headers = new Headers();
  if (token) headers.set("cookie", `${DATABASE_AUTH_COOKIE}=${token}`);
  return new Request("http://localhost/api/studio/sales", { headers });
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
  const passwordHash = await hashPassword("WriterSalesTestPassword2026");
  const writer = await prisma.user.create({
    data: {
      email: `writer-sales-${suffix}@example.test`,
      username: `writer-sales-${suffix}`.slice(0, 32),
      name: "Writer Sales Test",
      passwordHash,
      activeRole: RoleKey.WRITER,
      roles: {
        createMany: {
          data: [{ roleId: readerRole.id }, { roleId: writerRole.id }],
        },
      },
    },
  });
  const reader = await prisma.user.create({
    data: {
      email: `sales-reader-${suffix}@example.test`,
      username: `sales-reader-${suffix}`.slice(0, 32),
      name: "Sales Reader Test",
      passwordHash,
      roles: { create: { roleId: readerRole.id } },
    },
  });
  const [soldBook, unsoldBook, draftBook] = await Promise.all([
    prisma.book.create({
      data: {
        slug: `writer-sales-sold-${suffix}`,
        title: "Published Sales Book",
        authorId: writer.id,
        authorDisplayName: writer.name,
        price: 10,
        status: "PUBLISHED",
        visibility: "PUBLIC",
      },
    }),
    prisma.book.create({
      data: {
        slug: `writer-sales-unsold-${suffix}`,
        title: "Published Without Sales",
        authorId: writer.id,
        authorDisplayName: writer.name,
        price: 8,
        status: "PUBLISHED",
        visibility: "PUBLIC",
      },
    }),
    prisma.book.create({
      data: {
        slug: `writer-sales-draft-${suffix}`,
        title: "Draft Sales Book",
        authorId: writer.id,
        authorDisplayName: writer.name,
        price: 5,
        status: "DRAFT",
        visibility: "PRIVATE",
      },
    }),
  ]);
  const deliveredOrder = await prisma.order.create({
    data: {
      userId: reader.id,
      status: "DELIVERED",
      total: 20,
      currency: "GBP",
      shippingName: reader.name,
      shippingEmail: reader.email,
      shippingAddress: "10 Test Street",
      shippingCity: "London",
      shippingPostcode: "SW1A 1AA",
      items: {
        create: {
          bookId: soldBook.id,
          titleSnapshot: soldBook.title,
          authorSnapshot: writer.name,
          price: 10,
          quantity: 2,
        },
      },
    },
  });
  const refundedOrder = await prisma.order.create({
    data: {
      userId: reader.id,
      status: "REFUNDED",
      total: 50,
      currency: "GBP",
      shippingName: reader.name,
      shippingEmail: reader.email,
      shippingAddress: "10 Test Street",
      shippingCity: "London",
      shippingPostcode: "SW1A 1AA",
      items: {
        create: {
          bookId: soldBook.id,
          titleSnapshot: soldBook.title,
          authorSnapshot: writer.name,
          price: 10,
          quantity: 5,
        },
      },
    },
  });
  const writerSession = await createDatabaseSession(writer.id);
  const readerSession = await createDatabaseSession(reader.id);

  try {
    console.log("\nWriter sales analytics verification\n");

    const anonymous = await getStudioSales(request());
    const readerDenied = await getStudioSales(request(readerSession.token));
    assert(anonymous.status === 401, "Anonymous sales access was allowed.");
    assert(readerDenied.status === 403, "Reader sales access was allowed.");
    console.log("PASS - sales analytics requires a Writer or Admin session.");

    const response = await getStudioSales(request(writerSession.token));
    const payload = await response.json() as {
      sales?: {
        currency: string;
        totalBooksSold: number;
        totalRevenue: number;
        books: Array<{ bookId: string; booksSold: number; revenue: number }>;
      };
    };
    assert(response.status === 200 && payload.sales, "Writer sales response failed.");
    assert(payload.sales.currency === "GBP", "Writer revenue is not denominated in GBP.");
    assert(payload.sales.totalBooksSold === 2, "Refunded quantities affected books sold.");
    assert(payload.sales.totalRevenue === 20, "Writer revenue is not based on completed order items.");
    assert(payload.sales.books.length === 2, "Breakdown does not contain every published owned book.");
    assert(payload.sales.books.some((book) => book.bookId === unsoldBook.id && book.booksSold === 0), "Zero-sale published book is missing.");
    assert(!payload.sales.books.some((book) => book.bookId === draftBook.id), "Draft book leaked into sales analytics.");
    console.log("PASS - owned published-book totals exclude refunded orders and private drafts.");

    console.log("\nWriter sales analytics PASSED.\n");
  } finally {
    await revokeDatabaseSession(writerSession.token);
    await revokeDatabaseSession(readerSession.token);
    await prisma.order.deleteMany({ where: { id: { in: [deliveredOrder.id, refundedOrder.id] } } });
    await prisma.book.deleteMany({ where: { id: { in: [soldBook.id, unsoldBook.id, draftBook.id] } } });
    await prisma.user.deleteMany({ where: { id: { in: [writer.id, reader.id] } } });
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("\nWriter sales analytics FAILED.");
  console.error(error);
  process.exitCode = 1;
});
