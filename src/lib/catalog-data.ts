import type { FilterOptions } from "@/src/data/books";
import type { Book, BookChapter } from "@/src/types/book";
import { BookStatus } from "@/src/generated/prisma/client";
import { getPrismaClient } from "@/src/lib/prisma";

function requirePrisma() {
  const prisma = getPrismaClient();

  if (!prisma) {
    throw new Error(
      "PostgreSQL is required for catalogue operations.",
    );
  }

  return prisma;
}

function normalizeBook(book: Book): Book {
  return {
    ...book,
    featured: book.featured ?? false,
    new: book.new ?? false,
    status: book.status ?? "published",
    rating: book.rating ?? 0,
    reviews: book.reviews ?? 0,
    price: Number(book.price ?? 0),
    manuscriptChapters: book.manuscriptChapters ?? [],
  };
}

function toBookStatus(status?: Book["status"]): BookStatus {
  switch (status) {
    case "draft":
      return BookStatus.DRAFT;
    case "archived":
      return BookStatus.ARCHIVED;
    case "published":
    default:
      return BookStatus.PUBLISHED;
  }
}

function fromBookStatus(
  status: BookStatus,
): NonNullable<Book["status"]> {
  switch (status) {
    case BookStatus.DRAFT:
    case BookStatus.IN_REVIEW:
    case BookStatus.CHANGES_REQUESTED:
    case BookStatus.APPROVED:
      return "draft";
    case BookStatus.ARCHIVED:
      return "archived";
    case BookStatus.PUBLISHED:
      return "published";
  }
}

type DatabaseBook = {
  id: string;
  slug: string;
  title: string;
  authorDisplayName: string;
  coverUrl: string;
  price: { toString(): string };
  ratingAverage: { toString(): string };
  reviewCount: number;
  description: string;
  genre: string;
  featured: boolean;
  newRelease: boolean;
  status: BookStatus;
  chapters?: Array<{
    id: string;
    title: string;
    content: string;
    chapterNo: number;
    isPreview: boolean;
  }>;
};

function mapDatabaseBook(book: DatabaseBook): Book {
  const chapters: BookChapter[] = (book.chapters ?? [])
    .slice()
    .sort((a, b) => a.chapterNo - b.chapterNo)
    .map((chapter) => ({
      id: chapter.id,
      title: chapter.title,
      content: chapter.content,
      isPreview: chapter.isPreview,
    }));

  return normalizeBook({
    id: book.slug || book.id,
    title: book.title,
    author: book.authorDisplayName,
    cover: book.coverUrl,
    price: Number(book.price.toString()),
    rating: Number(book.ratingAverage.toString()),
    reviews: book.reviewCount,
    description: book.description,
    genre: book.genre,
    featured: book.featured,
    new: book.newRelease,
    status: fromBookStatus(book.status),
    manuscriptChapters: chapters,
  });
}

export async function getCatalogBooks(): Promise<Book[]> {
  const prisma = requirePrisma();

  const books = await prisma.book.findMany({
    include: {
      chapters: {
        orderBy: {
          chapterNo: "asc",
        },
      },
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  return books.map(mapDatabaseBook);
}

export async function getFeaturedBooks(): Promise<Book[]> {
  const books = await getCatalogBooks();

  return books
    .filter(
      (book) =>
        book.featured &&
        (book.status ?? "published") === "published",
    )
    .slice(0, 6);
}

export async function getNewBooks(): Promise<Book[]> {
  const books = await getCatalogBooks();

  return books.filter(
    (book) =>
      book.new &&
      (book.status ?? "published") === "published",
  );
}

export async function getBookById(
  id: string,
): Promise<Book | undefined> {
  const prisma = requirePrisma();

  const book = await prisma.book.findFirst({
    where: {
      OR: [
        { id },
        { slug: id },
      ],
    },
    include: {
      chapters: {
        orderBy: {
          chapterNo: "asc",
        },
      },
    },
  });

  return book ? mapDatabaseBook(book) : undefined;
}

export async function filterCatalogBooks(
  options: FilterOptions,
): Promise<Book[]> {
  let results = (await getCatalogBooks()).filter(
    (book) =>
      (book.status ?? "published") === "published",
  );

  if (options.search) {
    const query = options.search.toLowerCase();

    results = results.filter(
      (book) =>
        book.title.toLowerCase().includes(query) ||
        book.author.toLowerCase().includes(query),
    );
  }

  if (options.genre && options.genre !== "all") {
    results = results.filter(
      (book) => book.genre === options.genre,
    );
  }

  if (options.minPrice !== undefined) {
    results = results.filter(
      (book) => book.price >= options.minPrice!,
    );
  }

  if (options.maxPrice !== undefined) {
    results = results.filter(
      (book) => book.price <= options.maxPrice!,
    );
  }

  if (options.minRating !== undefined) {
    results = results.filter(
      (book) => book.rating >= options.minRating!,
    );
  }

  switch (options.sortBy) {
    case "price-asc":
      results.sort((a, b) => a.price - b.price);
      break;
    case "price-desc":
      results.sort((a, b) => b.price - a.price);
      break;
    case "rating":
      results.sort((a, b) => b.rating - a.rating);
      break;
    case "reviews":
      results.sort((a, b) => b.reviews - a.reviews);
      break;
    case "featured":
    default:
      results.sort(
        (a, b) =>
          Number(b.featured) - Number(a.featured),
      );
  }

  return results;
}

export async function createCatalogBook(
  input: Partial<Book>,
): Promise<Book> {
  const prisma = requirePrisma();

  const newBook = normalizeBook({
    id: input.id ?? `book-${Date.now()}`,
    title: input.title ?? "Untitled Book",
    author: input.author ?? "Unknown Author",
    cover: input.cover ?? "",
    price: Number(input.price ?? 0),
    rating: Number(input.rating ?? 0),
    reviews: Number(input.reviews ?? 0),
    description: input.description ?? "",
    genre: input.genre ?? "Fiction",
    featured: input.featured ?? false,
    new: input.new ?? false,
    status: input.status ?? "draft",
    manuscriptChapters: input.manuscriptChapters ?? [],
  });

  const created = await prisma.book.create({
    data: {
      id: newBook.id,
      slug: newBook.id,
      title: newBook.title,
      authorDisplayName: newBook.author,
      coverUrl: newBook.cover,
      price: newBook.price,
      ratingAverage: newBook.rating,
      reviewCount: newBook.reviews,
      description: newBook.description,
      genre: newBook.genre,
      featured: newBook.featured ?? false,
      newRelease: newBook.new ?? false,
      status: toBookStatus(newBook.status),
      chapters: newBook.manuscriptChapters?.length
        ? {
            create: newBook.manuscriptChapters.map(
              (chapter, index) => ({
                id: chapter.id,
                title: chapter.title,
                content: chapter.content,
                chapterNo: index + 1,
                isPreview: chapter.isPreview,
              }),
            ),
          }
        : undefined,
    },
    include: {
      chapters: {
        orderBy: {
          chapterNo: "asc",
        },
      },
    },
  });

  return mapDatabaseBook(created);
}

export async function updateCatalogBook(
  id: string,
  updates: Partial<Book>,
): Promise<Book | undefined> {
  const prisma = requirePrisma();

  const existing = await prisma.book.findFirst({
    where: {
      OR: [
        { id },
        { slug: id },
      ],
    },
    include: {
      chapters: {
        orderBy: {
          chapterNo: "asc",
        },
      },
    },
  });

  if (!existing) {
    return undefined;
  }

  const current = mapDatabaseBook(existing);

  const next = normalizeBook({
    ...current,
    ...updates,
    id: current.id,
    price: Number(updates.price ?? current.price),
    rating: Number(updates.rating ?? current.rating),
    reviews: Number(updates.reviews ?? current.reviews),
    manuscriptChapters: current.manuscriptChapters,
  });

  const updated = await prisma.book.update({
    where: {
      id: existing.id,
    },
    data: {
      title: next.title,
      authorDisplayName: next.author,
      coverUrl: next.cover,
      price: next.price,
      ratingAverage: next.rating,
      reviewCount: next.reviews,
      description: next.description,
      genre: next.genre,
      featured: next.featured ?? false,
      newRelease: next.new ?? false,
      status: toBookStatus(next.status),
    },
    include: {
      chapters: {
        orderBy: {
          chapterNo: "asc",
        },
      },
    },
  });

  return mapDatabaseBook(updated);
}

export async function deleteCatalogBook(
  id: string,
): Promise<boolean> {
  const prisma = requirePrisma();

  const deleted = await prisma.book.deleteMany({
    where: {
      OR: [
        { id },
        { slug: id },
      ],
    },
  });

  return deleted.count > 0;
}

export async function seedCatalogBooks(
  books: Book[],
): Promise<void> {
  const prisma = requirePrisma();
  const normalizedBooks = books.map(normalizeBook);

  for (const book of normalizedBooks) {
    await prisma.book.upsert({
      where: {
        slug: book.id,
      },
      update: {
        title: book.title,
        authorDisplayName: book.author,
        coverUrl: book.cover,
        price: book.price,
        ratingAverage: book.rating,
        reviewCount: book.reviews,
        description: book.description,
        genre: book.genre,
        featured: book.featured ?? false,
        newRelease: book.new ?? false,
        status: toBookStatus(book.status),
      },
      create: {
        id: book.id,
        slug: book.id,
        title: book.title,
        authorDisplayName: book.author,
        coverUrl: book.cover,
        price: book.price,
        ratingAverage: book.rating,
        reviewCount: book.reviews,
        description: book.description,
        genre: book.genre,
        featured: book.featured ?? false,
        newRelease: book.new ?? false,
        status: toBookStatus(book.status),
      },
    });
  }
}
