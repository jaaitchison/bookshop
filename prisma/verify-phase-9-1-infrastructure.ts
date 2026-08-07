import "dotenv/config";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { BookStatus, BookVisibility, RoleKey } from "../src/generated/prisma/client";
import { getPrismaClient } from "../src/lib/prisma";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

async function main() {
  console.log("");
  console.log("SECTION 9.1 - Database infrastructure verification");

  const schema = await readFile(path.join(process.cwd(), "prisma", "schema.prisma"), "utf8");
  const migration = await readFile(
    path.join(process.cwd(), "prisma", "migrations", "20260805210000_phase_9_1_core_schema", "migration.sql"),
    "utf8",
  );
  const seed = await readFile(path.join(process.cwd(), "prisma", "seed.ts"), "utf8");
  const catalogSeed = await readFile(path.join(process.cwd(), "prisma", "catalog-seed.ts"), "utf8");

  console.log("");
  console.log("1. Core schema models and workflow enums");
  for (const model of ["User", "WriterProfile", "Book", "BookEdition", "BookFile", "BookCover", "Cart", "Order", "OrderItem", "LibraryItem"]) {
    assert(schema.includes(`model ${model} {`), `${model} is missing from the Prisma schema.`);
  }
  for (const status of ["IN_REVIEW", "CHANGES_REQUESTED", "APPROVED"]) {
    assert(schema.includes(status), `${status} is missing from BookStatus.`);
  }
  assert(schema.includes("enum BookFileType"), "BookFileType is missing.");
  assert(schema.includes("visibility        BookVisibility"), "Book visibility is missing.");
  console.log("   PASS - Phase 9.1 models and publishing workflow are defined.");

  console.log("");
  console.log("2. Additive migration");
  assert(migration.includes('CREATE TABLE "BookEdition"'), "BookEdition migration is missing.");
  assert(migration.includes('CREATE TABLE "CartItem"'), "CartItem migration is missing.");
  assert(migration.includes('CREATE TABLE "LibraryItem"'), "LibraryItem migration is missing.");
  assert(migration.includes('UPDATE "Book" SET "visibility" = \'PUBLIC\''), "Published-book visibility backfill is missing.");
  console.log("   PASS - Migration creates new tables and preserves published catalogue visibility.");

  console.log("");
  console.log("3. Idempotent legacy catalogue seed");
  assert(seed.includes("seedLegacyCatalog(prisma)"), "prisma/seed.ts does not import the legacy catalogue.");
  assert(catalogSeed.includes('"data", "archive", "legacy-catalog.json"'), "Archived catalogue fallback is missing.");
  assert(catalogSeed.includes("bookCover.upsert"), "Seeded cover records are missing.");
  console.log("   PASS - Seed imports the archived mock catalogue without restoring a runtime JSON fallback.");

  const prisma = getPrismaClient();
  assert(prisma, "DATABASE_URL is not configured.");

  console.log("");
  console.log("4. PostgreSQL tables, roles and seeded catalogue");
  const [roles, books, covers, editions, files, carts, libraryItems] = await Promise.all([
    prisma.role.findMany({ select: { key: true } }),
    prisma.book.count(),
    prisma.bookCover.count(),
    prisma.bookEdition.count(),
    prisma.bookFile.count(),
    prisma.cart.count(),
    prisma.libraryItem.count(),
  ]);
  const roleKeys = new Set(roles.map(({ key }) => key));
  for (const role of [RoleKey.READER, RoleKey.WRITER, RoleKey.ADMIN]) {
    assert(roleKeys.has(role), `${role} role is missing.`);
  }
  assert(books > 0, "No books were seeded.");
  assert(covers > 0, "No BookCover rows were seeded.");
  console.log(`   PASS - ${books} books, ${covers} covers, ${editions} editions, ${files} files, ${carts} carts and ${libraryItems} library grants are queryable.`);

  console.log("");
  console.log("5. Public catalogue preservation");
  const hiddenPublished = await prisma.book.count({
    where: { status: BookStatus.PUBLISHED, visibility: { not: BookVisibility.PUBLIC } },
  });
  assert(hiddenPublished === 0, `${hiddenPublished} published books are not public.`);
  console.log("   PASS - Existing published books remain publicly visible.");

  console.log("");
  console.log("SECTION 9.1 PASSED.");
}

main()
  .catch((error) => {
    console.error("");
    console.error("SECTION 9.1 FAILED.");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    const prisma = getPrismaClient();
    if (prisma) await prisma.$disconnect();
  });
