import "dotenv/config";
import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  createCatalogBook,
  deleteCatalogBook,
  getBookById,
  updateCatalogBook,
} from "../src/lib/catalog-data";
import { getPrismaClient } from "../src/lib/prisma";

const testId = `section-4-5-test-${Date.now()}`;
const catalogPath = path.join(process.cwd(), "data", "catalog.json");

type JsonBook = {
  id: string;
  title: string;
  author: string;
  cover: string;
  price: number;
  rating: number;
  reviews: number;
  description: string;
  genre: string;
  featured?: boolean;
  new?: boolean;
  status?: "draft" | "published" | "archived";
};

async function readJsonCatalog(): Promise<JsonBook[]> {
  const raw = await readFile(catalogPath, "utf8");
  const parsed = JSON.parse(raw) as unknown;

  if (!Array.isArray(parsed)) {
    throw new Error("data/catalog.json is not an array.");
  }

  return parsed as JsonBook[];
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

async function verifyDatabaseBook(id: string) {
  const prisma = getPrismaClient();
  assert(prisma, "Prisma client is unavailable.");

  return prisma.book.findFirst({
    where: {
      OR: [
        { id },
        { slug: id },
      ],
    },
  });
}

async function cleanup() {
  const prisma = getPrismaClient();

  if (prisma) {
    await prisma.book.deleteMany({
      where: {
        OR: [
          { id: testId },
          { slug: testId },
        ],
      },
    });
  }

  const jsonBooks = await readJsonCatalog();
  const cleaned = jsonBooks.filter((book) => book.id !== testId);

  if (cleaned.length !== jsonBooks.length) {
    const { writeFile } = await import("node:fs/promises");
    await writeFile(catalogPath, JSON.stringify(cleaned, null, 2), "utf8");
  }
}

async function main() {
  console.log("");
  console.log("SECTION 4.5 mutation verification");
  console.log(`Temporary test id: ${testId}`);

  await cleanup();

  try {
    console.log("");
    console.log("1. CREATE");

    const created = await createCatalogBook({
      id: testId,
      title: "Section 4.5 Temporary Book",
      author: "Database Test Author",
      cover: "https://example.com/section-4-5-test.jpg",
      price: 9.99,
      rating: 4.2,
      reviews: 12,
      description: "Temporary catalogue mutation verification record.",
      genre: "Test",
      featured: false,
      new: true,
      status: "draft",
    });

    assert(created.id === testId, "Repository create returned the wrong id.");

    const dbCreated = await verifyDatabaseBook(testId);
    assert(dbCreated, "CREATE failed: book missing from PostgreSQL.");
    assert(dbCreated.title === "Section 4.5 Temporary Book", "CREATE failed: wrong PostgreSQL title.");

    const jsonCreated = (await readJsonCatalog()).find((book) => book.id === testId);
    assert(jsonCreated, "CREATE failed: book missing from JSON mirror.");
    assert(jsonCreated.title === "Section 4.5 Temporary Book", "CREATE failed: wrong JSON title.");

    console.log("CREATE PASSED: PostgreSQL and JSON mirror both contain the temporary book.");

    console.log("");
    console.log("2. UPDATE");

    const updated = await updateCatalogBook(testId, {
      title: "Section 4.5 Updated Temporary Book",
      price: 12.49,
      rating: 4.7,
      reviews: 18,
      featured: true,
      new: false,
      status: "published",
    });

    assert(updated, "UPDATE failed: repository returned undefined.");
    assert(updated.title === "Section 4.5 Updated Temporary Book", "UPDATE failed: wrong repository title.");

    const dbUpdated = await verifyDatabaseBook(testId);
    assert(dbUpdated, "UPDATE failed: book missing from PostgreSQL.");
    assert(dbUpdated.title === "Section 4.5 Updated Temporary Book", "UPDATE failed: PostgreSQL title not changed.");
    assert(dbUpdated.price.toFixed(2) === "12.49", "UPDATE failed: PostgreSQL price not changed.");
    assert(dbUpdated.ratingAverage.toFixed(2) === "4.70", "UPDATE failed: PostgreSQL rating not changed.");
    assert(dbUpdated.reviewCount === 18, "UPDATE failed: PostgreSQL review count not changed.");
    assert(dbUpdated.featured === true, "UPDATE failed: PostgreSQL featured flag not changed.");

    const jsonUpdated = (await readJsonCatalog()).find((book) => book.id === testId);
    assert(jsonUpdated, "UPDATE failed: book missing from JSON mirror.");
    assert(jsonUpdated.title === "Section 4.5 Updated Temporary Book", "UPDATE failed: JSON title not changed.");
    assert(Number(jsonUpdated.price).toFixed(2) === "12.49", "UPDATE failed: JSON price not changed.");
    assert(jsonUpdated.featured === true, "UPDATE failed: JSON featured flag not changed.");
    assert(jsonUpdated.status === "published", "UPDATE failed: JSON status not changed.");

    const repositoryUpdated = await getBookById(testId);
    assert(repositoryUpdated, "UPDATE failed: read-after-write lookup failed.");
    assert(repositoryUpdated.title === "Section 4.5 Updated Temporary Book", "UPDATE failed: runtime read returned stale data.");

    console.log("UPDATE PASSED: PostgreSQL, JSON mirror and runtime reads all reflect the change.");

    console.log("");
    console.log("3. DELETE");

    const deleted = await deleteCatalogBook(testId);
    assert(deleted === true, "DELETE failed: repository returned false.");

    const dbDeleted = await verifyDatabaseBook(testId);
    assert(!dbDeleted, "DELETE failed: book still exists in PostgreSQL.");

    const jsonDeleted = (await readJsonCatalog()).find((book) => book.id === testId);
    assert(!jsonDeleted, "DELETE failed: book still exists in JSON mirror.");

    const runtimeDeleted = await getBookById(testId);
    assert(!runtimeDeleted, "DELETE failed: runtime lookup still returns the book.");

    console.log("DELETE PASSED: temporary book removed from PostgreSQL, JSON mirror and runtime reads.");

    console.log("");
    console.log("SECTION 4.5 PASSED.");
    console.log("Catalogue create/update/delete stay synchronized between PostgreSQL and JSON.");
  } finally {
    await cleanup();
  }
}

main().catch((error) => {
  console.error("");
  console.error("SECTION 4.5 FAILED.");
  console.error(error);
  process.exit(1);
});