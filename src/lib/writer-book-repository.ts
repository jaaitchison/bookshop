import { BookStatus, RoleKey } from "@/src/generated/prisma/client";
import { getPrismaClient } from "@/src/lib/prisma";

export type WriterOwnedBookSummary = {
  id: string;
  slug?: string;
  title: string;
  authorDisplayName: string;
  authorId: string;
  description: string;
  genre: string;
  coverUrl: string;
  price: number;
  rating: number;
  reviews: number;
  status: "draft" | "published" | "archived";
  publishedAt: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

function requirePrisma() {
  const prisma = getPrismaClient();

  if (!prisma) {
    throw new Error(
      "PostgreSQL is required for Writer ownership operations.",
    );
  }

  return prisma;
}

function toClientStatus(
  status: BookStatus,
): WriterOwnedBookSummary["status"] {
  switch (status) {
    case BookStatus.PUBLISHED:
      return "published";
    case BookStatus.ARCHIVED:
      return "archived";
    case BookStatus.DRAFT:
    case BookStatus.IN_REVIEW:
    case BookStatus.CHANGES_REQUESTED:
    case BookStatus.APPROVED:
      return "draft";
  }
}

function mapBook(book: {
  id: string;
  slug?: string;
  title: string;
  authorDisplayName: string;
  authorId: string | null;
  description: string;
  genre: string;
  coverUrl: string;
  price: { toString(): string };
  ratingAverage: { toString(): string };
  reviewCount: number;
  status: BookStatus;
  publishedAt: Date | null;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): WriterOwnedBookSummary {
  if (!book.authorId) {
    throw new Error(
      `Writer-owned book ${book.id} has no authorId.`,
    );
  }

  return {
    id: book.id,
    slug: book.slug,
    title: book.title,
    authorDisplayName: book.authorDisplayName,
    authorId: book.authorId,
    description: book.description,
    genre: book.genre,
    coverUrl: book.coverUrl,
    price: Number(book.price.toString()),
    rating: Number(book.ratingAverage.toString()),
    reviews: book.reviewCount,
    status: toClientStatus(book.status),
    publishedAt: book.publishedAt?.toISOString() ?? null,
    archivedAt: book.archivedAt?.toISOString() ?? null,
    createdAt: book.createdAt.toISOString(),
    updatedAt: book.updatedAt.toISOString(),
  };
}

export async function ensureWriterProfile(
  userId: string,
) {
  const prisma = requirePrisma();

  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    include: {
      roles: {
        include: {
          role: true,
        },
      },
      writerProfile: true,
    },
  });

  if (!user) {
    throw new Error("Writer user does not exist.");
  }

  const hasWriterRole = user.roles.some(
    (assignment) =>
      assignment.role.key === RoleKey.WRITER ||
      assignment.role.key === RoleKey.ADMIN,
  );

  if (!hasWriterRole) {
    throw new Error("Writer role is required.");
  }

  if (user.writerProfile) {
    return user.writerProfile;
  }

  return prisma.writerProfile.create({
    data: {
      userId,
      biography: user.bio,
    },
  });
}

export async function getTrustedWriterDisplayName(
  userId: string,
): Promise<string> {
  const prisma = requirePrisma();

  const profile = await ensureWriterProfile(userId);

  if (profile.penName?.trim()) {
    return profile.penName.trim();
  }

  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      name: true,
      username: true,
    },
  });

  if (!user) {
    throw new Error("Writer user does not exist.");
  }

  return user.name.trim() || user.username;
}

export async function getWriterOwnedBooks(
  userId: string,
): Promise<WriterOwnedBookSummary[]> {
  const prisma = requirePrisma();

  const books = await prisma.book.findMany({
    where: {
      authorId: userId,
    },
    orderBy: {
      updatedAt: "desc",
    },
  });

  return books.map(mapBook);
}


export async function getAllWriterOwnedBooks(): Promise<
  WriterOwnedBookSummary[]
> {
  const prisma = requirePrisma();

  const books = await prisma.book.findMany({
    where: {
      authorId: {
        not: null,
      },
    },
    orderBy: {
      updatedAt: "desc",
    },
  });

  return books.map(mapBook);
}
export async function getWriterOwnedBook(
  userId: string,
  bookIdOrSlug: string,
): Promise<WriterOwnedBookSummary | null> {
  const prisma = requirePrisma();

  const book = await prisma.book.findFirst({
    where: {
      authorId: userId,
      OR: [
        { id: bookIdOrSlug },
        { slug: bookIdOrSlug },
      ],
    },
  });

  return book ? mapBook(book) : null;
}

export async function canManageBook(
  userId: string,
  bookIdOrSlug: string,
): Promise<boolean> {
  const prisma = requirePrisma();

  const [user, book] = await Promise.all([
    prisma.user.findUnique({
      where: {
        id: userId,
      },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
    }),
    prisma.book.findFirst({
      where: {
        OR: [
          { id: bookIdOrSlug },
          { slug: bookIdOrSlug },
        ],
      },
      select: {
        authorId: true,
      },
    }),
  ]);

  if (!user || !book) {
    return false;
  }

  const isAdmin = user.roles.some(
    (assignment) =>
      assignment.role.key === RoleKey.ADMIN,
  );

  if (isAdmin) {
    return true;
  }

  return book.authorId === userId;
}

export async function getManagedBookCoverUrl(
  userId: string,
  bookIdOrSlug: string,
): Promise<string | null> {
  const prisma = requirePrisma();

  if (!(await canManageBook(userId, bookIdOrSlug))) {
    throw new Error("You do not have permission to manage this book.");
  }

  const book = await prisma.book.findFirst({
    where: {
      OR: [{ id: bookIdOrSlug }, { slug: bookIdOrSlug }],
    },
    select: { coverUrl: true },
  });

  return book?.coverUrl ?? null;
}


export function slugifyBookTitle(title: string): string {
  const slug = title
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || "untitled-book";
}

export async function createUniqueBookSlug(
  title: string,
): Promise<string> {
  const prisma = requirePrisma();
  const baseSlug = slugifyBookTitle(title);

  let candidate = baseSlug;
  let suffix = 2;

  while (
    await prisma.book.findUnique({
      where: {
        slug: candidate,
      },
      select: {
        id: true,
      },
    })
  ) {
    candidate = `${baseSlug}-${suffix}`;
    suffix += 1;
  }

  return candidate;
}
export async function createWriterOwnedDraft(input: {
  userId: string;
  title: string;
  slug?: string;
  description?: string;
  genre?: string;
  coverUrl?: string;
  price?: number;
}): Promise<WriterOwnedBookSummary> {
  const prisma = requirePrisma();

  const title = input.title.trim();
  const slug = input.slug?.trim()
    ? input.slug.trim().toLowerCase()
    : await createUniqueBookSlug(title);

  if (!title) {
    throw new Error("Book title is required.");
  }

  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    throw new Error(
      "Book slug must contain lowercase letters, numbers and hyphens only.",
    );
  }

  await ensureWriterProfile(input.userId);
  const authorDisplayName =
    await getTrustedWriterDisplayName(input.userId);

  const book = await prisma.book.create({
    data: {
      slug,
      title,
      authorId: input.userId,
      authorDisplayName,
      description: input.description?.trim() ?? "",
      genre: input.genre?.trim() || "Fiction",
      coverUrl: input.coverUrl?.trim() ?? "",
      price: Number(input.price ?? 0),
      status: BookStatus.DRAFT,
      featured: false,
      newRelease: false,
      ratingAverage: 0,
      reviewCount: 0,
    },
  });

  return mapBook(book);
}

export type WriterBookMetadataUpdate = {
  title?: string;
  description?: string;
  genre?: string;
  coverUrl?: string;
  price?: number;
  status?: "draft" | "published" | "archived";
};

export type ManagedBookSummary = {
  id: string;
  slug: string;
  title: string;
  authorDisplayName: string;
  authorId: string | null;
  description: string;
  genre: string;
  coverUrl: string;
  price: number;
  rating: number;
  reviews: number;
  status: "draft" | "published" | "archived";
  publishedAt: string | null;
  archivedAt: string | null;
  updatedAt: string;
};

function mapManagedBook(book: {
  id: string;
  slug: string;
  title: string;
  authorDisplayName: string;
  authorId: string | null;
  description: string;
  genre: string;
  coverUrl: string;
  price: { toString(): string };
  ratingAverage: { toString(): string };
  reviewCount: number;
  status: BookStatus;
  publishedAt: Date | null;
  archivedAt: Date | null;
  updatedAt: Date;
}): ManagedBookSummary {
  return {
    id: book.id,
    slug: book.slug,
    title: book.title,
    authorDisplayName: book.authorDisplayName,
    authorId: book.authorId,
    description: book.description,
    genre: book.genre,
    coverUrl: book.coverUrl,
    price: Number(book.price.toString()),
    rating: Number(book.ratingAverage.toString()),
    reviews: book.reviewCount,
    status: toClientStatus(book.status),
    publishedAt: book.publishedAt?.toISOString() ?? null,
    archivedAt: book.archivedAt?.toISOString() ?? null,
    updatedAt: book.updatedAt.toISOString(),
  };
}

export async function updateManagedBookMetadata(
  userId: string,
  bookIdOrSlug: string,
  updates: WriterBookMetadataUpdate,
): Promise<ManagedBookSummary | null> {
  const prisma = requirePrisma();

  const existing = await prisma.book.findFirst({
    where: {
      OR: [
        { id: bookIdOrSlug },
        { slug: bookIdOrSlug },
      ],
    },
  });

  if (!existing) {
    return null;
  }

  if (!(await canManageBook(userId, existing.id))) {
    throw new Error("You do not have permission to manage this book.");
  }

  const data: {
    title?: string;
    description?: string;
    genre?: string;
    coverUrl?: string;
    price?: number;
    status?: BookStatus;
    publishedAt?: Date | null;
    archivedAt?: Date | null;
  } = {};

  if (updates.title !== undefined) {
    const title = updates.title.trim();

    if (!title) {
      throw new Error("Book title cannot be empty.");
    }

    data.title = title;
  }

  if (updates.description !== undefined) {
    data.description = updates.description.trim();
  }

  if (updates.genre !== undefined) {
    const genre = updates.genre.trim();

    if (!genre) {
      throw new Error("Book genre cannot be empty.");
    }

    data.genre = genre;
  }

  if (updates.coverUrl !== undefined) {
    data.coverUrl = updates.coverUrl.trim();
  }

  if (updates.price !== undefined) {
    if (
      !Number.isFinite(updates.price) ||
      updates.price < 0
    ) {
      throw new Error("Book price must be zero or greater.");
    }

    data.price = updates.price;
  }

  if (updates.status !== undefined) {
    const now = new Date();

    switch (updates.status) {
      case "draft":
        data.status = BookStatus.DRAFT;
        data.publishedAt = null;
        data.archivedAt = null;
        break;

      case "published":
        data.status = BookStatus.PUBLISHED;
        data.publishedAt = existing.publishedAt ?? now;
        data.archivedAt = null;
        break;

      case "archived":
        data.status = BookStatus.ARCHIVED;
        data.archivedAt = now;
        break;

      default:
        throw new Error("Invalid publishing status.");
    }
  }

  const updated = await prisma.book.update({
    where: {
      id: existing.id,
    },
    data,
  });

  return mapManagedBook(updated);
}
