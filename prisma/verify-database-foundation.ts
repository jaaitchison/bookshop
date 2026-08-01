import "dotenv/config";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { RoleKey } from "../src/generated/prisma/client";
import { getPrismaClient } from "../src/lib/prisma";
import { getCatalogBooks } from "../src/lib/catalog-data";

const catalogPath = path.join(process.cwd(), "data", "catalog.json");

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

async function main() {
  console.log("");
  console.log("SECTION 4.6 - Database foundation verification");
  console.log("");

  const prisma = getPrismaClient();
  assert(prisma, "DATABASE_URL is not configured or Prisma client is unavailable.");

  console.log("1. PostgreSQL connection");
  await prisma.$queryRaw`SELECT 1`;
  console.log("   PASS - PostgreSQL connection successful.");

  console.log("");
  console.log("2. Core database tables");
  const [
    userCount,
    roleCount,
    bookCount,
    chapterCount,
    orderCount,
    wishlistCount,
    reviewCount,
    sessionCount,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.role.count(),
    prisma.book.count(),
    prisma.chapter.count(),
    prisma.order.count(),
    prisma.wishlistItem.count(),
    prisma.review.count(),
    prisma.authSession.count(),
  ]);

  console.log(`   User: ${userCount}`);
  console.log(`   Role: ${roleCount}`);
  console.log(`   Book: ${bookCount}`);
  console.log(`   Chapter: ${chapterCount}`);
  console.log(`   Order: ${orderCount}`);
  console.log(`   WishlistItem: ${wishlistCount}`);
  console.log(`   Review: ${reviewCount}`);
  console.log(`   AuthSession: ${sessionCount}`);
  console.log("   PASS - Core tables are queryable.");

  console.log("");
  console.log("3. Seeded roles");
  const roles = await prisma.role.findMany({
    orderBy: { key: "asc" },
  });

  const roleKeys = new Set(roles.map((role) => role.key));

  assert(roleKeys.has(RoleKey.READER), "READER role is missing.");
  assert(roleKeys.has(RoleKey.WRITER), "WRITER role is missing.");
  assert(roleKeys.has(RoleKey.ADMIN), "ADMIN role is missing.");

  console.log("   PASS - READER, WRITER and ADMIN roles exist.");

  console.log("");
  console.log("4. PostgreSQL catalogue");
  assert(bookCount > 0, "PostgreSQL contains no books.");
  console.log(`   PASS - ${bookCount} books found in PostgreSQL.`);

  console.log("");
  console.log("5. Runtime catalogue repository");
  const runtimeBooks = await getCatalogBooks();
  assert(runtimeBooks.length > 0, "Runtime catalogue returned no books.");
  console.log(`   PASS - Runtime catalogue returned ${runtimeBooks.length} books.`);

  console.log("");
  console.log("6. JSON fallback readiness");
  await access(catalogPath);
  const rawCatalog = await readFile(catalogPath, "utf8");
  const jsonCatalog = JSON.parse(rawCatalog) as unknown;

  assert(Array.isArray(jsonCatalog), "data/catalog.json is not an array.");
  assert(jsonCatalog.length > 0, "data/catalog.json contains no books.");

  console.log(`   PASS - JSON fallback contains ${jsonCatalog.length} books.`);

  console.log("");
  console.log("7. Catalogue count comparison");
  if (runtimeBooks.length === jsonCatalog.length && bookCount === jsonCatalog.length) {
    console.log(`   PASS - PostgreSQL, runtime catalogue and JSON all contain ${bookCount} books.`);
  } else {
    console.log("   WARNING - Catalogue counts differ:");
    console.log(`   PostgreSQL: ${bookCount}`);
    console.log(`   Runtime: ${runtimeBooks.length}`);
    console.log(`   JSON: ${jsonCatalog.length}`);
    console.log("   This is allowed after future database-only content is added, but review it now.");
  }

  console.log("");
  console.log("SECTION 4.6 PASSED.");
  console.log("Database foundation is ready for the authentication migration.");
}

main()
  .catch((error) => {
    console.error("");
    console.error("SECTION 4.6 FAILED.");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    const prisma = getPrismaClient();
    if (prisma) {
      await prisma.$disconnect();
    }
  });