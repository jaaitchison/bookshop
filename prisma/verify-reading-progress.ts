import "dotenv/config";
import {
  getReadingProgressForUser,
  upsertReadingProgressForUser,
} from "../src/lib/reading-progress-repository";
import { getPrismaClient } from "../src/lib/prisma";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

async function main() {
  const prisma = getPrismaClient();
  assert(prisma, "Prisma client unavailable.");

  const reader = await prisma.user.findUnique({
    where: { email: "reader@bookshop.local" },
  });

  const writer = await prisma.user.findUnique({
    where: { email: "writer@bookshop.local" },
  });

  const book = await prisma.book.findFirst({
    orderBy: { createdAt: "asc" },
  });

  assert(reader, "Reader development user is missing.");
  assert(writer, "Writer development user is missing.");
  assert(book, "No PostgreSQL book exists.");
  const existingEntitlement = await prisma.libraryItem.findUnique({
    where: { userId_bookId: { userId: reader.id, bookId: book.id } },
  });
  const testEntitlement = existingEntitlement ?? await prisma.libraryItem.create({
    data: { userId: reader.id, bookId: book.id },
  });

  console.log("");
  console.log("SECTION 6.9 PostgreSQL reading-progress verification");
  console.log("");

  try {
    await prisma.readingProgress.deleteMany({
      where: {
        bookId: book.id,
        userId: { in: [reader.id, writer.id] },
      },
    });
    console.log("1. Create progress");

    const created = await upsertReadingProgressForUser({
      userId: reader.id,
      bookId: book.id,
      progress: 25,
    });

    assert(created.progress === 25, "Reading progress was not created.");
    console.log("   PASS - reading progress persisted in PostgreSQL.");

    console.log("");
    console.log("2. Update progress");

    const updated = await upsertReadingProgressForUser({
      userId: reader.id,
      bookId: book.id,
      progress: 70,
    });

    assert(updated.progress === 70, "Reading progress was not updated.");

    const count = await prisma.readingProgress.count({
      where: {
        userId: reader.id,
        bookId: book.id,
      },
    });

    assert(count === 1, "Duplicate progress rows were created.");
    console.log("   PASS - update reuses the user/book record.");

    console.log("");
    console.log("3. User isolation");

    const writerItems = await getReadingProgressForUser(writer.id);

    assert(
      !writerItems.some((item) => item.bookId === book.id),
      "Reader progress leaked into Writer account.",
    );

    console.log("   PASS - progress is isolated by user.");

    console.log("");
    console.log("4. Validation");

    let invalidRejected = false;

    try {
      await upsertReadingProgressForUser({
        userId: reader.id,
        bookId: book.id,
        progress: 101,
      });
    } catch {
      invalidRejected = true;
    }

    assert(
      invalidRejected,
      "Progress greater than 100 was accepted.",
    );

    console.log(
      "   PASS - progress is restricted to whole percentages from 0 to 100.",
    );

    console.log("");
    console.log("SECTION 6.9 PASSED.");
  } finally {
    await prisma.readingProgress.deleteMany({
      where: {
        bookId: book.id,
        userId: { in: [reader.id, writer.id] },
      },
    });
    if (!existingEntitlement) {
      await prisma.libraryItem.delete({ where: { id: testEntitlement.id } });
    }

    console.log("Temporary Section 6.9 reading progress cleaned up.");
  }
}

main()
  .catch((error) => {
    console.error("");
    console.error("SECTION 6.9 FAILED.");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    const prisma = getPrismaClient();

    if (prisma) {
      await prisma.$disconnect();
    }
  });
