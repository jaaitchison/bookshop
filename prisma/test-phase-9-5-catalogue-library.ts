import "dotenv/config";
import { GET as getBooks } from "../app/api/books/route";
import { GET as getLibrary } from "../app/api/library/route";
import {
  createDatabaseSession,
  DATABASE_AUTH_COOKIE,
  revokeDatabaseSession,
} from "../src/lib/database-session";
import {
  filterCatalogBooks,
  getBookById,
  getCatalogBooks,
  getCatalogGenres,
} from "../src/lib/catalog-data";
import { getPrismaClient } from "../src/lib/prisma";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function request(url: string, token?: string) {
  const headers = new Headers();
  if (token) headers.set("cookie", `${DATABASE_AUTH_COOKIE}=${token}`);
  return new Request(url, { headers });
}

async function main() {
  const prisma = getPrismaClient();
  assert(prisma, "Prisma client unavailable.");
  const [reader, writer, admin] = await Promise.all([
    prisma.user.findUnique({ where: { email: "reader@bookshop.local" } }),
    prisma.user.findUnique({ where: { email: "writer@bookshop.local" } }),
    prisma.user.findUnique({ where: { email: "admin@bookshop.local" } }),
  ]);
  assert(reader && writer && admin, "Development Reader, Writer and Admin users are required.");

  const suffix = Date.now();
  const slugs = {
    public: `section-9-5-public-${suffix}`,
    private: `section-9-5-private-${suffix}`,
    draft: `section-9-5-draft-${suffix}`,
    review: `section-9-5-review-${suffix}`,
  };
  await prisma.book.createMany({
    data: [
      { slug: slugs.public, title: "Section 9.5 Public Catalogue Book", authorDisplayName: "Live Author", genre: "Database Verification", status: "PUBLISHED", visibility: "PUBLIC" },
      { slug: slugs.private, title: "Section 9.5 Private Published Book", authorDisplayName: "Hidden Author", genre: "Database Verification", status: "PUBLISHED", visibility: "PRIVATE" },
      { slug: slugs.draft, title: "Section 9.5 Draft Book", authorDisplayName: "Draft Author", genre: "Database Verification", status: "DRAFT", visibility: "PUBLIC" },
      { slug: slugs.review, title: "Section 9.5 Review Book", authorDisplayName: "Review Author", genre: "Database Verification", status: "IN_REVIEW", visibility: "PUBLIC" },
    ],
  });
  const books = await prisma.book.findMany({ where: { slug: { in: Object.values(slugs) } } });
  const bySlug = new Map(books.map((book) => [book.slug, book]));
  const privateBook = bySlug.get(slugs.private);
  const publicBook = bySlug.get(slugs.public);
  assert(privateBook && publicBook, "Test books are missing.");
  await prisma.chapter.createMany({
    data: [
      { bookId: publicBook.id, title: "Public Preview", content: "Safe preview content", chapterNo: 1, isPreview: true },
      { bookId: publicBook.id, title: "Private Chapter", content: "Never expose this content", chapterNo: 2, isPreview: false },
    ],
  });

  const readerSession = await createDatabaseSession(reader.id);
  const writerSession = await createDatabaseSession(writer.id);
  const adminSession = await createDatabaseSession(admin.id);

  try {
    console.log("");
    console.log("SECTION 9.5 - Catalogue and library runtime verification");

    console.log("");
    console.log("1. Strict public catalogue constraints");
    const catalogue = await getCatalogBooks();
    const publicResult = catalogue.find((book) => book.id === slugs.public);
    assert(publicResult, "Public published book is missing.");
    assert(publicResult.manuscriptChapters?.length === 1 && publicResult.manuscriptChapters[0]?.isPreview, "Non-preview chapter content leaked publicly.");
    for (const hidden of [slugs.private, slugs.draft, slugs.review]) {
      assert(!catalogue.some((book) => book.id === hidden), `${hidden} leaked into the public catalogue.`);
      assert(!(await getBookById(hidden)), `${hidden} leaked through public detail lookup.`);
    }
    console.log("   PASS - only PUBLISHED + PUBLIC books reach list and detail reads.");

    console.log("");
    console.log("2. Database search, genre facets and public API");
    const filtered = await filterCatalogBooks({ search: "Section 9.5 Public", genre: "Database Verification" });
    const genres = await getCatalogGenres();
    const apiResponse = await getBooks(request("http://localhost/api/books?search=Section%209.5%20Public"));
    const apiBooks = await apiResponse.json() as Array<{ id: string }>;
    assert(filtered.some((book) => book.id === slugs.public), "Database filter missed the public book.");
    assert(genres.includes("Database Verification"), "Live database genre facet is missing.");
    assert(apiBooks.some((book) => book.id === slugs.public), "Public books API missed the public book.");
    assert(!apiBooks.some((book) => book.id !== slugs.public && Object.values(slugs).includes(book.id)), "Public API leaked hidden workflow state.");
    console.log("   PASS - search, genres and API results are backed by constrained PostgreSQL reads.");

    console.log("");
    console.log("3. Admin-only management catalogue");
    const writerDrafts = await getBooks(request("http://localhost/api/books?includeDrafts=true", writerSession.token));
    const adminDrafts = await getBooks(request("http://localhost/api/books?includeDrafts=true", adminSession.token));
    assert(writerDrafts.status === 403, "Writer received the global management catalogue.");
    assert(adminDrafts.status === 200, "Admin could not read the global management catalogue.");
    console.log("   PASS - global draft visibility is restricted to Administrators.");

    console.log("");
    console.log("4. Live LibraryItem API");
    await prisma.libraryItem.create({ data: { userId: reader.id, bookId: privateBook.id } });
    await prisma.readingProgress.create({ data: { userId: reader.id, bookId: privateBook.id, progress: 37 } });
    const noSession = await getLibrary(request("http://localhost/api/library"));
    const ownedResponse = await getLibrary(request("http://localhost/api/library", readerSession.token));
    const payload = await ownedResponse.json() as { items?: Array<{ book: { slug: string }; progress: number | null }> };
    const owned = payload.items?.find((item) => item.book.slug === slugs.private);
    assert(noSession.status === 401, "Unauthenticated library read was allowed.");
    assert(ownedResponse.status === 200 && owned?.progress === 37, "Live library item/progress was not returned.");
    console.log("   PASS - the authenticated library is sourced from LibraryItem and ReadingProgress rows.");

    console.log("");
    console.log("SECTION 9.5 PASSED.");
  } finally {
    await revokeDatabaseSession(readerSession.token);
    await revokeDatabaseSession(writerSession.token);
    await revokeDatabaseSession(adminSession.token);
    await prisma.book.deleteMany({ where: { slug: { in: Object.values(slugs) } } });
    await prisma.$disconnect();
    console.log("Temporary Section 9.5 records cleaned up.");
  }
}

main().catch((error) => {
  console.error("");
  console.error("SECTION 9.5 FAILED.");
  console.error(error);
  process.exitCode = 1;
});
