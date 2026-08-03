import "dotenv/config";
import {
  getPublishedBookReviews,
  upsertBookReviewForUser,
} from "../src/lib/review-repository";
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
    where: {
      email: "reader@bookshop.local",
    },
  });

  const writer = await prisma.user.findUnique({
    where: {
      email: "writer@bookshop.local",
    },
  });

  const book = await prisma.book.findFirst({
    orderBy: {
      createdAt: "asc",
    },
  });

  assert(reader, "Reader development user is missing.");
  assert(writer, "Writer development user is missing.");
  assert(book, "No PostgreSQL book exists.");

  console.log("");
  console.log("SECTION 6.8 PostgreSQL review verification");
  console.log("");

  try {
    await prisma.review.deleteMany({
      where: {
        bookId: book.id,
        userId: {
          in: [reader.id, writer.id],
        },
      },
    });

    console.log("1. Create Reader review");

    const readerReviews = await upsertBookReviewForUser({
      userId: reader.id,
      bookId: book.id,
      rating: 5,
      comment: "Section 6.8 Reader review",
      verifiedPurchase: true,
    });

    assert(
      readerReviews.some(
        (review) =>
          review.user === reader.name &&
          review.comment === "Section 6.8 Reader review",
      ),
      "Reader review was not returned.",
    );

    const readerRow = await prisma.review.findUnique({
      where: {
        userId_bookId: {
          userId: reader.id,
          bookId: book.id,
        },
      },
    });

    assert(readerRow, "Reader review was not persisted.");
    assert(
      readerRow.verifiedPurchase,
      "Verified purchase was not persisted.",
    );

    console.log(
      "   PASS - reviewer identity and verified purchase persisted in PostgreSQL.",
    );

    console.log("");
    console.log("2. One review per user/book");

    await upsertBookReviewForUser({
      userId: reader.id,
      bookId: book.id,
      rating: 4,
      comment: "Updated Section 6.8 review",
      verifiedPurchase: true,
    });

    const duplicateCount = await prisma.review.count({
      where: {
        userId: reader.id,
        bookId: book.id,
      },
    });

    assert(
      duplicateCount === 1,
      "Duplicate review rows were created.",
    );

    const updated = await prisma.review.findUnique({
      where: {
        userId_bookId: {
          userId: reader.id,
          bookId: book.id,
        },
      },
    });

    assert(
      updated?.rating === 4 &&
        updated.comment === "Updated Section 6.8 review",
      "Existing review was not updated.",
    );

    console.log(
      "   PASS - repeat submission updates the existing review.",
    );

    console.log("");
    console.log("3. User isolation");

    await upsertBookReviewForUser({
      userId: writer.id,
      bookId: book.id,
      rating: 3,
      comment: "Section 6.8 Writer review",
      verifiedPurchase: false,
    });

    const rows = await prisma.review.findMany({
      where: {
        bookId: book.id,
        userId: {
          in: [reader.id, writer.id],
        },
      },
    });

    assert(
      rows.length === 2,
      "Reviews from separate users were not isolated.",
    );

    console.log(
      "   PASS - separate users retain separate reviews.",
    );

    console.log("");
    console.log("4. Public review shape");

    const publicReviews = await getPublishedBookReviews(book.id);

    assert(
      publicReviews.every(
        (review) =>
          typeof review.user === "string" &&
          !("userId" in review),
      ),
      "Public review response exposed database identity.",
    );

    console.log(
      "   PASS - public reviews expose display names, not user IDs.",
    );

    console.log("");
    console.log("SECTION 6.8 PASSED.");
  } finally {
    await prisma.review.deleteMany({
      where: {
        bookId: book.id,
        userId: {
          in: [reader.id, writer.id],
        },
      },
    });

    console.log("Temporary Section 6.8 reviews cleaned up.");
  }
}

main()
  .catch((error) => {
    console.error("");
    console.error("SECTION 6.8 FAILED.");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    const prisma = getPrismaClient();

    if (prisma) {
      await prisma.$disconnect();
    }
  });