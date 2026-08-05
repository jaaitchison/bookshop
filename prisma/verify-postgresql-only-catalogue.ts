import "dotenv/config";
import {
  getBookById,
  getCatalogBooks,
} from "../src/lib/catalog-data";
import { BookStatus, BookVisibility } from "../src/generated/prisma/client";
import { getPrismaClient } from "../src/lib/prisma";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

async function main() {
  const prisma = getPrismaClient();
  assert(prisma, "Prisma client unavailable.");

  console.log("");
  console.log("SECTION 7.8 PostgreSQL-only catalogue verification");
  console.log("");

  console.log("1. Database catalogue");

  const databaseCount = await prisma.book.count({
    where: { status: BookStatus.PUBLISHED, visibility: BookVisibility.PUBLIC },
  });
  const catalogBooks = await getCatalogBooks();

  assert(
    catalogBooks.length === databaseCount,
    `Catalogue returned ${catalogBooks.length} books but PostgreSQL contains ${databaseCount}.`,
  );

  console.log(
    "   PASS - catalogue list is sourced directly from PostgreSQL.",
  );

  console.log("");
  console.log("2. Single-book lookup");

  const sample = await prisma.book.findFirst({
    where: { status: BookStatus.PUBLISHED, visibility: BookVisibility.PUBLIC },
    orderBy: {
      createdAt: "asc",
    },
  });

  if (sample) {
    const byId = await getBookById(sample.id);
    const bySlug = await getBookById(sample.slug);

    assert(byId, "PostgreSQL book ID lookup failed.");
    assert(bySlug, "PostgreSQL book slug lookup failed.");
    assert(
      byId.title === sample.title &&
        bySlug.title === sample.title,
      "Catalogue lookup does not match PostgreSQL.",
    );
  }

  console.log(
    "   PASS - book lookup uses PostgreSQL ID/slug authority.",
  );

  console.log("");
  console.log("3. Chapter mapping");

  const withChapter = await prisma.book.findFirst({
    where: {
      status: BookStatus.PUBLISHED,
      visibility: BookVisibility.PUBLIC,
      chapters: {
        some: {},
      },
    },
    include: {
      chapters: true,
    },
  });

  if (withChapter) {
    const mapped = await getBookById(withChapter.id);

    assert(
      mapped?.manuscriptChapters?.length ===
        withChapter.chapters.filter((chapter) => chapter.isPreview).length,
      "Public preview chapters were not mapped safely into catalogue Book shape.",
    );
  }

  console.log(
    "   PASS - catalogue chapter mapping remains database-backed.",
  );

  console.log("");
  console.log("SECTION 7.8 PASSED.");
}

main()
  .catch((error) => {
    console.error("");
    console.error("SECTION 7.8 FAILED.");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    const prisma = getPrismaClient();

    if (prisma) {
      await prisma.$disconnect();
    }
  });
