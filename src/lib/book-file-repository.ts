import { randomUUID } from "node:crypto";
import { BookFileType, type BookFileFormat } from "@/src/generated/prisma/client";
import { getPrismaClient } from "@/src/lib/prisma";
import { canManageBook } from "@/src/lib/writer-book-repository";

function requirePrisma() {
  const prisma = getPrismaClient();
  if (!prisma) throw new Error("PostgreSQL is unavailable for book-file operations.");
  return prisma;
}

export function parseBookFileType(value: unknown): BookFileType | null {
  if (value === BookFileType.MANUSCRIPT || value === BookFileType.SAMPLE) return value;
  return null;
}

export async function listManagedBookFiles(userId: string, bookIdOrSlug: string) {
  const prisma = requirePrisma();
  if (!(await canManageBook(userId, bookIdOrSlug))) {
    throw new Error("You do not have permission to manage this book.");
  }

  return prisma.bookFile.findMany({
    where: { book: { OR: [{ id: bookIdOrSlug }, { slug: bookIdOrSlug }] } },
    select: {
      id: true,
      fileType: true,
      format: true,
      originalName: true,
      contentType: true,
      sizeBytes: true,
      isPublic: true,
      fileUrl: true,
      updatedAt: true,
    },
    orderBy: { fileType: "asc" },
  });
}

export async function replaceManagedBookFile(
  userId: string,
  bookIdOrSlug: string,
  input: {
    fileType: BookFileType;
    format: BookFileFormat;
    originalName: string;
    contentType: string;
    sizeBytes: number;
    storageKey: string;
  },
) {
  const prisma = requirePrisma();
  if (!(await canManageBook(userId, bookIdOrSlug))) {
    throw new Error("You do not have permission to manage this book.");
  }

  const book = await prisma.book.findFirst({
    where: { OR: [{ id: bookIdOrSlug }, { slug: bookIdOrSlug }] },
    select: { id: true },
  });
  if (!book) return null;

  const previous = await prisma.bookFile.findUnique({
    where: { bookId_fileType: { bookId: book.id, fileType: input.fileType } },
    select: { id: true, storageKey: true },
  });
  const fileId = previous?.id ?? randomUUID();

  const file = await prisma.$transaction(async (tx) => {
    let edition = await tx.bookEdition.findFirst({
      where: { bookId: book.id },
      orderBy: { createdAt: "asc" },
      select: { id: true },
    });
    edition ??= await tx.bookEdition.create({
      data: { bookId: book.id, name: "First edition" },
      select: { id: true },
    });

    return tx.bookFile.upsert({
      where: { bookId_fileType: { bookId: book.id, fileType: input.fileType } },
      update: {
        editionId: edition.id,
        storageKey: input.storageKey,
        fileUrl: `/api/library/download/${fileId}`,
        format: input.format,
        originalName: input.originalName,
        contentType: input.contentType,
        sizeBytes: input.sizeBytes,
        isPublic: input.fileType === BookFileType.SAMPLE,
      },
      create: {
        id: fileId,
        bookId: book.id,
        editionId: edition.id,
        storageKey: input.storageKey,
        fileUrl: `/api/library/download/${fileId}`,
        fileType: input.fileType,
        format: input.format,
        originalName: input.originalName,
        contentType: input.contentType,
        sizeBytes: input.sizeBytes,
        isPublic: input.fileType === BookFileType.SAMPLE,
      },
      select: {
        id: true,
        fileType: true,
        format: true,
        originalName: true,
        contentType: true,
        sizeBytes: true,
        isPublic: true,
        fileUrl: true,
        updatedAt: true,
      },
    });
  });

  return { file, previousStorageKey: previous?.storageKey ?? null };
}

export async function removeManagedBookFile(
  userId: string,
  bookIdOrSlug: string,
  fileType: BookFileType,
) {
  const prisma = requirePrisma();
  if (!(await canManageBook(userId, bookIdOrSlug))) {
    throw new Error("You do not have permission to manage this book.");
  }

  const file = await prisma.bookFile.findFirst({
    where: {
      fileType,
      book: { OR: [{ id: bookIdOrSlug }, { slug: bookIdOrSlug }] },
    },
    select: { id: true, storageKey: true },
  });
  if (!file) return null;
  await prisma.bookFile.delete({ where: { id: file.id } });
  return file;
}

export async function getEntitledBookFile(userId: string, fileId: string) {
  return requirePrisma().bookFile.findFirst({
    where: {
      id: fileId,
      book: { libraryItems: { some: { userId } } },
    },
    select: {
      id: true,
      storageKey: true,
      originalName: true,
      contentType: true,
      sizeBytes: true,
      format: true,
      fileType: true,
      fileUrl: true,
      book: {
        select: {
          id: true,
          slug: true,
          title: true,
          authorDisplayName: true,
          readingProgress: {
            where: { userId },
            select: { progress: true },
            take: 1,
          },
        },
      },
    },
  });
}
