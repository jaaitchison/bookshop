import { ReviewStatus } from "@/src/generated/prisma/client";
import type { BookReview } from "@/src/types/book";
import { getPrismaClient } from "@/src/lib/prisma";

function requirePrisma() {
  const prisma = getPrismaClient();

  if (!prisma) {
    throw new Error("PostgreSQL is unavailable for review operations.");
  }

  return prisma;
}

type ReviewWithUser = {
  id: string;
  rating: number;
  comment: string;
  createdAt: Date;
  user: {
    name: string;
    username: string;
  };
};

function databaseReviewToBookReview(
  review: ReviewWithUser,
): BookReview {
  return {
    id: review.id,
    user: review.user.name || review.user.username,
    rating: review.rating,
    comment: review.comment,
    createdAt: review.createdAt.toISOString(),
  };
}

export async function getPublishedBookReviews(
  bookId: string,
): Promise<BookReview[]> {
  const prisma = requirePrisma();

  const reviews = await prisma.review.findMany({
    where: {
      bookId,
      status: ReviewStatus.PUBLISHED,
    },
    include: {
      user: {
        select: {
          name: true,
          username: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return reviews.map(databaseReviewToBookReview);
}

export async function upsertBookReviewForUser(input: {
  userId: string;
  bookId: string;
  rating: number;
  comment: string;
  verifiedPurchase: boolean;
}): Promise<BookReview[]> {
  const prisma = requirePrisma();

  const [user, book] = await Promise.all([
    prisma.user.findUnique({
      where: {
        id: input.userId,
      },
      select: {
        id: true,
      },
    }),
    prisma.book.findUnique({
      where: {
        id: input.bookId,
      },
      select: {
        id: true,
      },
    }),
  ]);

  if (!user) {
    throw new Error("Review user does not exist.");
  }

  if (!book) {
    throw new Error("Review book does not exist.");
  }

  const comment = input.comment.trim();

  if (!comment) {
    throw new Error("Review comment cannot be empty.");
  }

  if (
    !Number.isInteger(input.rating) ||
    input.rating < 1 ||
    input.rating > 5
  ) {
    throw new Error("Review rating must be an integer from 1 to 5.");
  }

  await prisma.review.upsert({
    where: {
      userId_bookId: {
        userId: input.userId,
        bookId: input.bookId,
      },
    },
    update: {
      rating: input.rating,
      comment,
      verifiedPurchase: input.verifiedPurchase,
      status: ReviewStatus.PUBLISHED,
    },
    create: {
      userId: input.userId,
      bookId: input.bookId,
      rating: input.rating,
      comment,
      verifiedPurchase: input.verifiedPurchase,
      status: ReviewStatus.PUBLISHED,
    },
  });

  return getPublishedBookReviews(input.bookId);
}