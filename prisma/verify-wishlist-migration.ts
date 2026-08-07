import "dotenv/config";
import {
  getWishlistItemsForUser,
  toggleWishlistItemForUser,
} from "../src/lib/wishlist-repository";
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
  console.log("SECTION 6.5 PostgreSQL wishlist verification");
  console.log("");

  try {
    await prisma.wishlistItem.deleteMany({
      where: {
        bookId: book.id,
        userId: {
          in: [reader.id, writer.id],
        },
      },
    });

    console.log("1. Reader add");

    const readerItems = await toggleWishlistItemForUser(
      reader.id,
      book.id,
      "add",
    );

    assert(
      readerItems.includes(book.id),
      "Reader wishlist did not contain the added book.",
    );

    const row = await prisma.wishlistItem.findUnique({
      where: {
        userId_bookId: {
          userId: reader.id,
          bookId: book.id,
        },
      },
    });

    assert(row, "WishlistItem was not persisted in PostgreSQL.");

    console.log("   PASS - Reader wishlist item persisted.");

    console.log("");
    console.log("2. Duplicate add");

    await toggleWishlistItemForUser(
      reader.id,
      book.id,
      "add",
    );

    const duplicateCount = await prisma.wishlistItem.count({
      where: {
        userId: reader.id,
        bookId: book.id,
      },
    });

    assert(
      duplicateCount === 1,
      "Duplicate wishlist rows were created.",
    );

    console.log("   PASS - duplicate add is idempotent.");

    console.log("");
    console.log("3. User isolation");

    const writerItems = await getWishlistItemsForUser(writer.id);

    assert(
      !writerItems.includes(book.id),
      "Reader wishlist leaked into Writer wishlist.",
    );

    console.log("   PASS - wishlists are isolated by user.");

    console.log("");
    console.log("4. Remove");

    const afterRemove = await toggleWishlistItemForUser(
      reader.id,
      book.id,
      "remove",
    );

    assert(
      !afterRemove.includes(book.id),
      "Removed book still appears in Reader wishlist.",
    );

    console.log("   PASS - remove deletes only the user's wishlist row.");

    console.log("");
    console.log("SECTION 6.5 PASSED.");
  } finally {
    await prisma.wishlistItem.deleteMany({
      where: {
        bookId: book.id,
        userId: {
          in: [reader.id, writer.id],
        },
      },
    });

    console.log("Temporary Section 6.5 wishlist rows cleaned up.");
  }
}

main()
  .catch((error) => {
    console.error("");
    console.error("SECTION 6.5 FAILED.");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    const prisma = getPrismaClient();

    if (prisma) {
      await prisma.$disconnect();
    }
  });