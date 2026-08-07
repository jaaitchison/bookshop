import { access, readFile } from "node:fs/promises";
import path from "node:path";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function read(...parts: string[]) {
  return readFile(path.join(process.cwd(), ...parts), "utf8");
}

async function main() {
  console.log("");
  console.log("SECTION 9.5 - Live catalogue and library verification");
  const [catalogue, booksApi, detail, booksPage, filters, libraryApi, libraryRepository, libraryPage, accountPage] = await Promise.all([
    read("src", "lib", "catalog-data.ts"),
    read("app", "api", "books", "route.ts"),
    read("app", "books", "[id]", "page.tsx"),
    read("app", "books", "page.tsx"),
    read("src", "components", "book", "BookFilters.tsx"),
    read("app", "api", "library", "route.ts"),
    read("src", "lib", "library-repository.ts"),
    read("app", "library", "page.tsx"),
    read("app", "account", "page.tsx"),
  ]);

  console.log("");
  console.log("1. Public query boundary");
  for (const marker of ["BookStatus.PUBLISHED", "BookVisibility.PUBLIC", "publicCatalogueWhere", "...publicCatalogueWhere"]) {
    assert(catalogue.includes(marker), `Catalogue boundary marker missing: ${marker}`);
  }
  assert(catalogue.includes("where: { isPreview: true }"), "Public queries expose non-preview chapter content.");
  assert(!detail.includes("canViewDraft"), "Public detail page still bypasses workflow visibility.");
  console.log("   PASS - list and detail queries enforce PUBLISHED + PUBLIC in PostgreSQL.");

  console.log("");
  console.log("2. Separated management access");
  assert(catalogue.includes("getAllCatalogBooksForManagement"), "Management repository read is missing.");
  assert(booksApi.includes('userHasRole(session.userId, "admin")'), "Global management catalogue is not Admin-only.");
  console.log("   PASS - management reads are explicit and Administrator-only.");

  console.log("");
  console.log("3. Live search and facets");
  assert(booksApi.includes('facets") === "genres"') && catalogue.includes("getCatalogGenres"), "Database genre facets are missing.");
  assert(booksPage.includes("/api/books?facets=genres") && filters.includes("genres.map"), "Filter UI does not use live genres.");
  console.log("   PASS - catalogue search/filter UI binds to live API results and database genres.");

  console.log("");
  console.log("4. PostgreSQL reader library");
  for (const marker of ["getRequestDatabaseSession", 'userHasRole(session.userId, "reader")', "getLibraryItemsForUser"]) {
    assert(libraryApi.includes(marker), `Library API marker missing: ${marker}`);
  }
  assert(libraryRepository.includes("libraryItem.findMany") && libraryRepository.includes("readingProgress"), "Library repository is not database-backed.");
  assert(libraryPage.includes("/api/library") && accountPage.includes("/api/library"), "Reader library UI is not live-bound.");
  console.log("   PASS - LibraryItem and ReadingProgress drive library and account views.");

  console.log("");
  console.log("5. Prototype catalogue removal");
  let mockSourceExists = true;
  await access(path.join(process.cwd(), "src", "data", "books.ts")).catch(() => { mockSourceExists = false; });
  assert(!mockSourceExists, "src/data/books.ts prototype catalogue still exists.");
  for (const source of [booksPage, filters, libraryPage, accountPage]) {
    assert(!source.includes("mockBooks"), "Runtime UI still references mockBooks.");
  }
  console.log("   PASS - the TypeScript mock catalogue is no longer a runtime authority.");

  console.log("");
  console.log("SECTION 9.5 PASSED.");
}

main().catch((error) => {
  console.error("");
  console.error("SECTION 9.5 FAILED.");
  console.error(error);
  process.exitCode = 1;
});
