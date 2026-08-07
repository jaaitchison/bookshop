import { getPrismaClient } from "@/src/lib/prisma";
import { canManageBook } from "@/src/lib/writer-book-repository";

export type ManagedChapterRevision = {
  id: string;
  chapterId: string;
  userId: string;
  title: string;
  content: string;
  isPreview: boolean;
  createdAt: string;
};

function requirePrisma() {
  const prisma = getPrismaClient();
  if (!prisma) {
    throw new Error("PostgreSQL is required for chapter revision operations.");
  }
  return prisma;
}

function mapRevision(revision: {
  id: string;
  chapterId: string;
  userId: string;
  title: string;
  content: string;
  isPreview: boolean;
  createdAt: Date;
}): ManagedChapterRevision {
  return { ...revision, createdAt: revision.createdAt.toISOString() };
}

async function resolveManagedChapter(
  userId: string,
  bookIdOrSlug: string,
  chapterId: string,
): Promise<{ id: string } | null> {
  const prisma = requirePrisma();
  const book = await prisma.book.findFirst({
    where: { OR: [{ id: bookIdOrSlug }, { slug: bookIdOrSlug }] },
    select: { id: true },
  });

  if (!book) return null;
  if (!(await canManageBook(userId, book.id))) {
    throw new Error("You do not have permission to manage this book.");
  }

  return prisma.chapter.findFirst({
    where: { id: chapterId, bookId: book.id },
    select: { id: true },
  });
}

export async function getManagedChapterRevisions(
  userId: string,
  bookIdOrSlug: string,
  chapterId: string,
): Promise<ManagedChapterRevision[] | null> {
  const prisma = requirePrisma();
  const chapter = await resolveManagedChapter(userId, bookIdOrSlug, chapterId);
  if (!chapter) return null;

  const revisions = await prisma.chapterRevision.findMany({
    where: { chapterId: chapter.id },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
  });

  return revisions.map(mapRevision);
}

export async function getManagedChapterRevision(
  userId: string,
  bookIdOrSlug: string,
  chapterId: string,
  revisionId: string,
): Promise<ManagedChapterRevision | null> {
  const prisma = requirePrisma();
  const chapter = await resolveManagedChapter(userId, bookIdOrSlug, chapterId);
  if (!chapter) return null;

  const revision = await prisma.chapterRevision.findFirst({
    where: { id: revisionId, chapterId: chapter.id },
  });

  return revision ? mapRevision(revision) : null;
}
