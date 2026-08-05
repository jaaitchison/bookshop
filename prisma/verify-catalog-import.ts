import "dotenv/config";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

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
};

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not configured.");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

const catalogPath = path.join(process.cwd(), "data", "archive", "legacy-catalog.json");

async function main() {
  const source = JSON.parse(await readFile(catalogPath, "utf8")) as LegacyCatalogBook[];
  const databaseBooks = await prisma.book.findMany({
    where: {
      slug: {
        in: source.map((book) => book.id),
      },
    },
    orderBy: {
      slug: "asc",
    },
  });

  const databaseBySlug = new Map(databaseBooks.map((book) => [book.slug, book]));
  const problems: string[] = [];

  for (const sourceBook of source) {
    const databaseBook = databaseBySlug.get(sourceBook.id);

    if (!databaseBook) {
      problems.push(`${sourceBook.id}: missing from PostgreSQL`);
      continue;
    }

    const comparisons: Array<[string, unknown, unknown]> = [
      ["id", sourceBook.id, databaseBook.id],
      ["slug", sourceBook.id, databaseBook.slug],
      ["title", sourceBook.title, databaseBook.title],
      ["author", sourceBook.author, databaseBook.authorDisplayName],
      ["cover", sourceBook.cover, databaseBook.coverUrl],
      ["price", sourceBook.price.toFixed(2), databaseBook.price.toFixed(2)],
      ["rating", sourceBook.rating.toFixed(2), databaseBook.ratingAverage.toFixed(2)],
      ["reviews", sourceBook.reviews, databaseBook.reviewCount],
      ["description", sourceBook.description, databaseBook.description],
      ["genre", sourceBook.genre, databaseBook.genre],
      ["featured", sourceBook.featured ?? false, databaseBook.featured],
      ["new", sourceBook.new ?? false, databaseBook.newRelease],
    ];

    for (const [field, expected, actual] of comparisons) {
      if (expected !== actual) {
        problems.push(
          `${sourceBook.id}: ${field} mismatch (source=${String(expected)}, database=${String(actual)})`,
        );
      }
    }
  }

  const chapterCount = await prisma.chapter.count();
  const importedBookCount = databaseBooks.length;

  console.log("");
  console.log("Catalogue verification");
  console.log(`Source books: ${source.length}`);
  console.log(`Matching PostgreSQL books: ${importedBookCount}`);
  console.log(`Current chapter records: ${chapterCount}`);

  if (problems.length > 0) {
    console.error("");
    console.error("Verification FAILED:");
    for (const problem of problems) {
      console.error(`- ${problem}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log("");
  console.log("Verification PASSED.");
  console.log("Every source catalogue field matches its PostgreSQL record.");
  console.log("No chapter import was expected because data/catalog.json contains no chapter data.");
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
