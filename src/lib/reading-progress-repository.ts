import { getPrismaClient } from "@/src/lib/prisma";

export type ReadingProgressRecord = {
  bookId: string;
  chapterId: string | null;
  progress: number;
  updatedAt: string;
};

function requirePrisma() {
  const prisma = getPrismaClient();

  if (!prisma) {
    throw new Error(
      "PostgreSQL is unavailable for reading-progress operations.",
    );
  }

  return prisma;
}

export async function getReadingProgressForUser(
  userId: string,
): Promise<ReadingProgressRecord[]> {
  const prisma = requirePrisma();

  const rows = await prisma.readingProgress.findMany({
    where: {
      userId,
    },
    orderBy: {
      updatedAt: "desc",
    },
  });

  return rows.map((row) => ({
    bookId: row.bookId,
    chapterId: row.chapterId,
    progress: row.progress,
    updatedAt: row.updatedAt.toISOString(),
  }));
}

export async function upsertReadingProgressForUser(input: {
  userId: string;
  bookId: string;
  chapterId?: string | null;
  progress: number;
}): Promise<ReadingProgressRecord> {
  const prisma = requirePrisma();

  if (
    !Number.isInteger(input.progress) ||
    input.progress < 0 ||
    input.progress > 100
  ) {
    throw new Error(
      "Reading progress must be a whole number from 0 to 100.",
    );
  }

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
    throw new Error("Reading-progress user does not exist.");
  }

  if (!book) {
    throw new Error("Reading-progress book does not exist.");
  }

  if (input.chapterId) {
    const chapter = await prisma.chapter.findFirst({
      where: {
        id: input.chapterId,
        bookId: input.bookId,
      },
      select: {
        id: true,
      },
    });

    if (!chapter) {
      throw new Error(
        "Reading-progress chapter does not belong to this book.",
      );
    }
  }

  const row = await prisma.readingProgress.upsert({
    where: {
      userId_bookId: {
        userId: input.userId,
        bookId: input.bookId,
      },
    },
    update: {
      chapterId: input.chapterId ?? null,
      progress: input.progress,
    },
    create: {
      userId: input.userId,
      bookId: input.bookId,
      chapterId: input.chapterId ?? null,
      progress: input.progress,
    },
  });

  return {
    bookId: row.bookId,
    chapterId: row.chapterId,
    progress: row.progress,
    updatedAt: row.updatedAt.toISOString(),
  };
}