import "dotenv/config";
import {
  createCatalogBook,
  deleteCatalogBook,
  getBookById,
  updateCatalogBook,
} from "../src/lib/catalog-data";
import { getPrismaClient } from "../src/lib/prisma";

const testId = `section-9-5-mutation-${Date.now()}`;

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function main() {
  const prisma = getPrismaClient();
  assert(prisma, "Prisma client unavailable.");

  console.log("");
  console.log("SECTION 9.5 PostgreSQL-only catalogue mutation verification");

  try {
    console.log("");
    console.log("1. Private draft creation");
    await createCatalogBook({
      id: testId,
      title: "Section 9.5 Temporary Book",
      author: "Database Test Author",
      price: 9.99,
      description: "Temporary database-only catalogue record.",
      genre: "Test",
      status: "draft",
    });
    const draft = await prisma.book.findUnique({ where: { slug: testId } });
    assert(draft?.status === "DRAFT" && draft.visibility === "PRIVATE", "Draft was not private.");
    assert(!(await getBookById(testId)), "Private draft leaked through public detail lookup.");
    console.log("   PASS - new drafts exist only in PostgreSQL and remain private.");

    console.log("");
    console.log("2. Public publishing transition");
    const updated = await updateCatalogBook(testId, {
      title: "Section 9.5 Published Book",
      price: 12.49,
      status: "published",
    });
    assert(updated?.title === "Section 9.5 Published Book", "Update failed.");
    const published = await prisma.book.findUnique({ where: { slug: testId } });
    assert(published?.status === "PUBLISHED" && published.visibility === "PUBLIC", "Published book is not public.");
    assert((await getBookById(testId))?.title === updated.title, "Public read-after-write failed.");
    console.log("   PASS - publishing changes status and visibility together.");

    console.log("");
    console.log("3. PostgreSQL deletion");
    assert(await deleteCatalogBook(testId), "Delete failed.");
    assert(!(await prisma.book.findUnique({ where: { slug: testId } })), "Book remains in PostgreSQL.");
    assert(!(await getBookById(testId)), "Deleted book remains publicly readable.");
    console.log("   PASS - deletion removes the sole database authority record.");

    console.log("");
    console.log("SECTION 9.5 MUTATION TEST PASSED.");
  } finally {
    await prisma.book.deleteMany({ where: { slug: testId } });
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("");
  console.error("SECTION 9.5 MUTATION TEST FAILED.");
  console.error(error);
  process.exitCode = 1;
});
