import "dotenv/config";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import { BookStatus, PrismaClient } from "../src/generated/prisma/client";

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

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not configured.");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

const catalogPath = path.join(process.cwd(), "data", "catalog.json");

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
  const requiredStrings: Array<keyof LegacyCatalogBook> = [
    "id",
    "title",
    "author",
    "cover",
    "description",
    "genre",
  ];

  for (const key of requiredStrings) {
    if (typeof candidate[key] !== "string" || !String(candidate[key]).trim()) {
      throw new Error(`Catalogue item ${index + 1} has an invalid ${String(key)}.`);
    }
  }

  if (typeof candidate.price !== "number" || !Number.isFinite(candidate.price) || candidate.price < 0) {
    throw new Error(`Catalogue item ${index + 1} has an invalid price.`);
  }

  if (typeof candidate.rating !== "number" || !Number.isFinite(candidate.rating) || candidate.rating < 0 || candidate.rating > 5) {
    throw new Error(`Catalogue item ${index + 1} has an invalid rating.`);
  }

  if (!Number.isInteger(candidate.reviews) || Number(candidate.reviews) < 0) {
    throw new Error(`Catalogue item ${index + 1} has an invalid reviews count.`);
  }
}

async function main() {
  const raw = await readFile(catalogPath, "utf8");
  const parsed = JSON.parse(raw) as unknown;

  if (!Array.isArray(parsed)) {
    throw new Error("data/catalog.json must contain an array of books.");
  }

  parsed.forEach(validateBook);

  const seenIds = new Set<string>();
  for (const book of parsed) {
    if (seenIds.has(book.id)) {
      throw new Error(`Duplicate catalogue id found: ${book.id}`);
    }
    seenIds.add(book.id);
  }

  let created = 0;
  let updated = 0;

  for (const legacyBook of parsed) {
    const existing = await prisma.book.findUnique({
      where: { slug: legacyBook.id },
      select: { id: true },
    });

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
      status: mapStatus(legacyBook.status),
    };

    if (existing) {
      await prisma.book.update({
        where: { slug: legacyBook.id },
        data,
      });
      updated += 1;
      continue;
    }

    await prisma.book.create({
      data: {
        id: legacyBook.id,
        slug: legacyBook.id,
        ...data,
      },
    });
    created += 1;
  }

  const databaseCount = await prisma.book.count();

  console.log("");
  console.log("Catalogue import complete.");
  console.log(`Source books: ${parsed.length}`);
  console.log(`Created: ${created}`);
  console.log(`Updated: ${updated}`);
  console.log(`Books currently in database: ${databaseCount}`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });