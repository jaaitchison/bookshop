import { getPrismaClient } from "@/src/lib/prisma";
import { canManageBook } from "@/src/lib/writer-book-repository";

export type ManagedChapter = {
  id: string;
  bookId: string;
  title: string;
  content: string;
  chapterNo: number;
  isPreview: boolean;
  createdAt: string;
  updatedAt: string;
};

function requirePrisma() {
  const prisma = getPrismaClient();

  if (!prisma) {
    throw new Error(
      "PostgreSQL is required for Writer chapter operations.",
    );
  }

  return prisma;
}

function mapChapter(chapter: {
  id: string;
  bookId: string;
  title: string;
  content: string;
  chapterNo: number;
  isPreview: boolean;
  createdAt: Date;
  updatedAt: Date;
}): ManagedChapter {
  return {
    id: chapter.id,
    bookId: chapter.bookId,
    title: chapter.title,
    content: chapter.content,
    chapterNo: chapter.chapterNo,
    isPreview: chapter.isPreview,
    createdAt: chapter.createdAt.toISOString(),
    updatedAt: chapter.updatedAt.toISOString(),
  };
}

async function resolveBook(
  userId: string,
  bookIdOrSlug: string,
): Promise<{ id: string } | null> {
  const prisma = requirePrisma();

  const book = await prisma.book.findFirst({
    where: {
      OR: [
        { id: bookIdOrSlug },
        { slug: bookIdOrSlug },
      ],
    },
    select: {
      id: true,
    },
  });

  if (!book) {
    return null;
  }

  if (!(await canManageBook(userId, book.id))) {
    throw new Error(
      "You do not have permission to manage this book.",
    );
  }

  return book;
}

export async function getManagedChapters(
  userId: string,
  bookIdOrSlug: string,
): Promise<ManagedChapter[] | null> {
  const prisma = requirePrisma();
  const book = await resolveBook(userId, bookIdOrSlug);

  if (!book) {
    return null;
  }

  const chapters = await prisma.chapter.findMany({
    where: {
      bookId: book.id,
    },
    orderBy: {
      chapterNo: "asc",
    },
  });

  return chapters.map(mapChapter);
}

export async function createManagedChapter(
  userId: string,
  bookIdOrSlug: string,
  input: {
    title: string;
    content?: string;
    isPreview?: boolean;
  },
): Promise<ManagedChapter | null> {
  const prisma = requirePrisma();
  const book = await resolveBook(userId, bookIdOrSlug);

  if (!book) {
    return null;
  }

  const title = input.title.trim();

  if (!title) {
    throw new Error("Chapter title is required.");
  }

  const lastChapter = await prisma.chapter.findFirst({
    where: {
      bookId: book.id,
    },
    orderBy: {
      chapterNo: "desc",
    },
    select: {
      chapterNo: true,
    },
  });

  const chapter = await prisma.chapter.create({
    data: {
      bookId: book.id,
      title,
      content: input.content ?? "",
      chapterNo: (lastChapter?.chapterNo ?? 0) + 1,
      isPreview: input.isPreview ?? false,
    },
  });

  return mapChapter(chapter);
}

export async function updateManagedChapter(
  userId: string,
  bookIdOrSlug: string,
  chapterId: string,
  updates: {
    title?: string;
    content?: string;
    isPreview?: boolean;
  },
): Promise<ManagedChapter | null> {
  const prisma = requirePrisma();
  const book = await resolveBook(userId, bookIdOrSlug);

  if (!book) {
    return null;
  }

  const existing = await prisma.chapter.findFirst({
    where: {
      id: chapterId,
      bookId: book.id,
    },
  });

  if (!existing) {
    return null;
  }

  const data: {
    title?: string;
    content?: string;
    isPreview?: boolean;
  } = {};

  if (updates.title !== undefined) {
    const title = updates.title.trim();

    if (!title) {
      throw new Error("Chapter title cannot be empty.");
    }

    data.title = title;
  }

  if (updates.content !== undefined) {
    data.content = updates.content;
  }

  if (updates.isPreview !== undefined) {
    data.isPreview = updates.isPreview;
  }

  const updated = await prisma.chapter.update({
    where: {
      id: existing.id,
    },
    data,
  });

  return mapChapter(updated);
}

export async function reorderManagedChapters(
  userId: string,
  bookIdOrSlug: string,
  chapterIds: string[],
): Promise<ManagedChapter[] | null> {
  const prisma = requirePrisma();
  const book = await resolveBook(userId, bookIdOrSlug);

  if (!book) {
    return null;
  }

  const chapters = await prisma.chapter.findMany({
    where: {
      bookId: book.id,
    },
    select: {
      id: true,
    },
  });

  if (
    chapterIds.length !== chapters.length ||
    new Set(chapterIds).size !== chapterIds.length
  ) {
    throw new Error(
      "Chapter reorder must contain every chapter exactly once.",
    );
  }

  const existingIds = new Set(
    chapters.map((chapter) => chapter.id),
  );

  if (
    chapterIds.some(
      (chapterId) => !existingIds.has(chapterId),
    )
  ) {
    throw new Error(
      "Chapter reorder contains a chapter from another book.",
    );
  }

  await prisma.$transaction(async (tx) => {
    for (let index = 0; index < chapterIds.length; index += 1) {
      await tx.chapter.update({
        where: {
          id: chapterIds[index],
        },
        data: {
          chapterNo: -(index + 1),
        },
      });
    }

    for (let index = 0; index < chapterIds.length; index += 1) {
      await tx.chapter.update({
        where: {
          id: chapterIds[index],
        },
        data: {
          chapterNo: index + 1,
        },
      });
    }
  });

  const reordered = await prisma.chapter.findMany({
    where: {
      bookId: book.id,
    },
    orderBy: {
      chapterNo: "asc",
    },
  });

  return reordered.map(mapChapter);
}

export async function deleteManagedChapter(
  userId: string,
  bookIdOrSlug: string,
  chapterId: string,
): Promise<boolean | null> {
  const prisma = requirePrisma();
  const book = await resolveBook(userId, bookIdOrSlug);

  if (!book) {
    return null;
  }

  const existing = await prisma.chapter.findFirst({
    where: {
      id: chapterId,
      bookId: book.id,
    },
    select: {
      id: true,
    },
  });

  if (!existing) {
    return false;
  }

  await prisma.$transaction(async (tx) => {
    await tx.chapter.delete({
      where: {
        id: existing.id,
      },
    });

    const remaining = await tx.chapter.findMany({
      where: {
        bookId: book.id,
      },
      orderBy: {
        chapterNo: "asc",
      },
      select: {
        id: true,
      },
    });

    for (let index = 0; index < remaining.length; index += 1) {
      await tx.chapter.update({
        where: {
          id: remaining[index].id,
        },
        data: {
          chapterNo: -(index + 1),
        },
      });
    }

    for (let index = 0; index < remaining.length; index += 1) {
      await tx.chapter.update({
        where: {
          id: remaining[index].id,
        },
        data: {
          chapterNo: index + 1,
        },
      });
    }
  });

  return true;
}