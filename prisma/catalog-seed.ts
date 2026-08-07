import { access, readFile } from "node:fs/promises";
import path from "node:path";
import {
  BookStatus,
  BookVisibility,
  type PrismaClient,
} from "../src/generated/prisma/client";

type LegacyCatalogBook = {
  id: string;
  title: string;
  author: string;
  cover: string;
  price: number;
  rating: number;
  reviews: number;
  description: string;
  genre: string;
  featured?: boolean;
  new?: boolean;
  status?: "draft" | "published" | "archived";
};

const catalogCandidates = [
  path.join(process.cwd(), "data", "catalog.json"),
  path.join(process.cwd(), "data", "archive", "legacy-catalog.json"),
];

function mapStatus(status?: LegacyCatalogBook["status"]): BookStatus {
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

function validateBook(book: unknown, index: number): asserts book is LegacyCatalogBook {
  if (!book || typeof book !== "object") {
    throw new Error(`Catalogue item ${index + 1} is not an object.`);
  }

  const candidate = book as Partial<LegacyCatalogBook>;
  for (const key of ["id", "title", "author", "cover", "description", "genre"] as const) {
    if (typeof candidate[key] !== "string" || !candidate[key]?.trim()) {
      throw new Error(`Catalogue item ${index + 1} has an invalid ${key}.`);
    }
  }

  if (typeof candidate.price !== "number" || !Number.isFinite(candidate.price) || candidate.price < 0) {
    throw new Error(`Catalogue item ${index + 1} has an invalid price.`);
  }

  if (typeof candidate.rating !== "number" || candidate.rating < 0 || candidate.rating > 5) {
    throw new Error(`Catalogue item ${index + 1} has an invalid rating.`);
  }

  if (!Number.isInteger(candidate.reviews) || Number(candidate.reviews) < 0) {
    throw new Error(`Catalogue item ${index + 1} has an invalid reviews count.`);
  }
}

async function resolveCatalogPath() {
  for (const candidate of catalogCandidates) {
    try {
      await access(candidate);
      return candidate;
    } catch {
      // Try the archived source after the retired runtime JSON location.
    }
  }

  throw new Error("No legacy catalogue seed source was found.");
}

export async function seedLegacyCatalog(
  prisma: PrismaClient,
  options: { overwriteExisting?: boolean } = {},
) {
  const sourcePath = await resolveCatalogPath();
  const parsed = JSON.parse(await readFile(sourcePath, "utf8")) as unknown;

  if (!Array.isArray(parsed)) {
    throw new Error(`${path.relative(process.cwd(), sourcePath)} must contain an array of books.`);
  }

  parsed.forEach(validateBook);
  const ids = new Set<string>();
  for (const book of parsed) {
    if (ids.has(book.id)) {
      throw new Error(`Duplicate catalogue id found: ${book.id}`);
    }
    ids.add(book.id);
  }

  let created = 0;
  let updated = 0;

  for (const legacyBook of parsed) {
    const status = mapStatus(legacyBook.status);
    const data = {
      title: legacyBook.title.trim(),
      authorDisplayName: legacyBook.author.trim(),
      description: legacyBook.description.trim(),
      genre: legacyBook.genre.trim(),
      coverUrl: legacyBook.cover.trim(),
      price: legacyBook.price,
      ratingAverage: legacyBook.rating,
      reviewCount: legacyBook.reviews,
      featured: legacyBook.featured ?? false,
      newRelease: legacyBook.new ?? false,
      status,
      visibility: status === BookStatus.PUBLISHED ? BookVisibility.PUBLIC : BookVisibility.PRIVATE,
    };

    const existing = await prisma.book.findUnique({
      where: { slug: legacyBook.id },
      select: { id: true },
    });

    const book = existing
      ? options.overwriteExisting
        ? await prisma.book.update({ where: { id: existing.id }, data, select: { id: true } })
        : existing
      : await prisma.book.create({
          data: { id: legacyBook.id, slug: legacyBook.id, ...data },
          select: { id: true },
        });

    if (existing && options.overwriteExisting) updated += 1;
    if (!existing) created += 1;

    await prisma.bookCover.upsert({
      where: { bookId: book.id },
      update: {},
      create: {
        bookId: book.id,
        storageKey: `legacy-external/${legacyBook.id}`,
        url: legacyBook.cover.trim(),
        ratio: "2:3",
      },
    });
  }

  return {
    sourcePath: path.relative(process.cwd(), sourcePath),
    sourceCount: parsed.length,
    created,
    updated,
    databaseCount: await prisma.book.count(),
  };
}
