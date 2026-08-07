import { coverUrlOrFallback } from "@/src/lib/cover-storage";
import { getPrismaClient } from "@/src/lib/prisma";
import type { ReaderLibraryItem } from "@/src/types/library";

function requirePrisma() {
  const prisma = getPrismaClient();
  if (!prisma) throw new Error("PostgreSQL is unavailable for library operations.");
  return prisma;
}

export async function getLibraryItemsForUser(userId: string): Promise<ReaderLibraryItem[]> {
  const items = await requirePrisma().libraryItem.findMany({
    where: { userId },
    include: {
      book: {
        select: {
          id: true,
          slug: true,
          title: true,
          authorDisplayName: true,
          coverUrl: true,
          files: {
            select: {
              id: true,
              fileType: true,
              format: true,
              originalName: true,
              fileUrl: true,
              sizeBytes: true,
            },
            orderBy: { fileType: "asc" },
          },
          readingProgress: {
            where: { userId },
            select: { progress: true },
            take: 1,
          },
        },
      },
    },
    orderBy: { acquiredAt: "desc" },
  });

  return items.map((item) => ({
    id: item.id,
    acquiredAt: item.acquiredAt.toISOString(),
    progress: item.book.readingProgress[0]?.progress ?? null,
    book: {
      id: item.book.id,
      slug: item.book.slug,
      title: item.book.title,
      author: item.book.authorDisplayName,
      cover: coverUrlOrFallback(item.book.coverUrl),
    },
    files: item.book.files,
  }));
}
