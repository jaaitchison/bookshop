import { getPrismaClient } from "@/src/lib/prisma";

function requirePrisma() {
  const prisma = getPrismaClient();

  if (!prisma) {
    throw new Error("PostgreSQL is unavailable for wishlist operations.");
  }

  return prisma;
}

export async function getWishlistItemsForUser(
  userId: string,
): Promise<string[]> {
  const prisma = requirePrisma();

  const items = await prisma.wishlistItem.findMany({
    where: {
      userId,
    },
    select: {
      bookId: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return items.map((item) => item.bookId);
}

export async function toggleWishlistItemForUser(
  userId: string,
  bookId: string,
  action: "add" | "remove",
): Promise<string[]> {
  const prisma = requirePrisma();

  if (action === "remove") {
    await prisma.wishlistItem.deleteMany({
      where: {
        userId,
        bookId,
      },
    });

    return getWishlistItemsForUser(userId);
  }

  const [user, book] = await Promise.all([
    prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        id: true,
      },
    }),
    prisma.book.findUnique({
      where: {
        id: bookId,
      },
      select: {
        id: true,
      },
    }),
  ]);

  if (!user) {
    throw new Error("Wishlist user does not exist.");
  }

  if (!book) {
    throw new Error("Wishlist book does not exist.");
  }

  await prisma.wishlistItem.upsert({
    where: {
      userId_bookId: {
        userId,
        bookId,
      },
    },
    update: {},
    create: {
      userId,
      bookId,
    },
  });

  return getWishlistItemsForUser(userId);
}