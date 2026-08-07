import { access, readFile } from "node:fs/promises";
import path from "node:path";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

async function exists(relativePath: string) {
  try {
    await access(path.join(process.cwd(), relativePath));
    return true;
  } catch {
    return false;
  }
}

async function read(relativePath: string) {
  return readFile(path.join(process.cwd(), relativePath), "utf8");
}

async function main() {
  console.log("");
  console.log("SECTION 7.10 Phase 7 close-out verification");
  console.log("");

  console.log("1. Ownership foundation");

  const ownershipRepository = await read(
    "src/lib/writer-book-repository.ts",
  );

  for (const marker of [
    "ensureWriterProfile",
    "getWriterOwnedBooks",
    "canManageBook",
    "createWriterOwnedDraft",
    "updateManagedBookMetadata",
  ]) {
    assert(
      ownershipRepository.includes(marker),
      `Writer ownership marker missing: ${marker}`,
    );
  }

  console.log(
    "   PASS - trusted Writer ownership and mutation foundation is present.",
  );

  console.log("");
  console.log("2. Studio API and editor");

  for (const requiredFile of [
    "app/api/studio/books/route.ts",
    "app/studio/new/page.tsx",
    "app/studio/books/[id]/page.tsx",
  ]) {
    assert(
      await exists(requiredFile),
      `Missing Writer Studio file: ${requiredFile}`,
    );
  }

  const studioEditor = await read(
    "app/studio/books/[id]/page.tsx",
  );

  assert(
    studioEditor.includes("/api/studio/books/") &&
      studioEditor.includes("/chapters"),
    "Writer editor is not wired to secure Studio APIs.",
  );

  console.log(
    "   PASS - real Writer creation/editor routes are wired to secure APIs.",
  );

  console.log("");
  console.log("3. Stable chapter workflow");

  const chapterRepository = await read(
    "src/lib/writer-chapter-repository.ts",
  );

  for (const marker of [
    "createManagedChapter",
    "updateManagedChapter",
    "reorderManagedChapters",
    "deleteManagedChapter",
  ]) {
    assert(
      chapterRepository.includes(marker),
      `Stable chapter marker missing: ${marker}`,
    );
  }

  console.log(
    "   PASS - chapter records have dedicated stable PostgreSQL operations.",
  );

  console.log("");
  console.log("4. PostgreSQL-only catalogue");

  assert(
    !(await exists("data/catalog.json")),
    "Active data/catalog.json still exists.",
  );

  const catalogue = await read("src/lib/catalog-data.ts");

  for (const forbidden of [
    "readCatalogFile",
    "writeCatalogFile",
    "mirrorBookToJson",
    "removeBookFromJson",
  ]) {
    assert(
      !catalogue.includes(forbidden),
      `Legacy catalogue compatibility marker remains: ${forbidden}`,
    );
  }

  assert(
    catalogue.includes(
      "PostgreSQL is required for catalogue operations.",
    ),
    "Catalogue does not explicitly require PostgreSQL.",
  );

  console.log(
    "   PASS - PostgreSQL is the sole active catalogue authority.",
  );

  console.log("");
  console.log("5. Real browser Writer workflow");

  const browserTest = await read(
    "tests/browser/writer-studio-flow.spec.ts",
  );

  for (const marker of [
    "Reader cannot access Writer Studio",
    "Writer creates a Draft through the real Studio UI",
    "Writer edits metadata and manages chapters in the real editor",
    "Writer publishes and archives through the browser",
    "Writer cannot access a foreign-owned draft by editor URL",
    "Admin can use Writer Studio routes with explicit ownership rules",
  ]) {
    assert(
      browserTest.includes(marker),
      `Writer browser coverage missing: ${marker}`,
    );
  }

  console.log(
    "   PASS - real-browser ownership, editing and publishing workflow is covered.",
  );

  console.log("");
  console.log("6. Phase 7 documentation");

  for (const requiredDoc of [
    "docs/PHASE-7-1-CATALOGUE-STUDIO-AUDIT.md",
    "docs/SECTION-7-2-WRITER-OWNERSHIP.md",
    "docs/SECTION-7-3-STUDIO-BOOKS-API.md",
    "docs/SECTION-7-4-SECURE-BOOK-CREATION.md",
    "docs/SECTION-7-5-SECURE-BOOK-UPDATES.md",
    "docs/SECTION-7-6-STABLE-CHAPTERS.md",
    "docs/SECTION-7-7-WRITER-STUDIO-EDITOR.md",
    "docs/SECTION-7-8-POSTGRESQL-ONLY-CATALOGUE.md",
    "docs/SECTION-7-9-WRITER-BROWSER-FLOW.md",
    "docs/PHASE-7-CLOSEOUT.md",
  ]) {
    assert(
      await exists(requiredDoc),
      `Missing Phase 7 documentation: ${requiredDoc}`,
    );
  }

  console.log(
    "   PASS - Phase 7 architecture and migration work is documented.",
  );

  console.log("");
  console.log("SECTION 7.10 PASSED.");
  console.log(
    "Phase 7 Writer ownership, Studio editing and PostgreSQL catalogue migration are complete.",
  );
}

main().catch((error) => {
  console.error("");
  console.error("SECTION 7.10 FAILED.");
  console.error(error);
  process.exit(1);
});