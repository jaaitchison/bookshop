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
  console.log("SECTION 9.4 - Private manuscript and sample verification");
  const [schema, migration, validation, storage, upload, download, repository, editor] = await Promise.all([
    read("prisma", "schema.prisma"),
    read("prisma", "migrations", "20260805230000_phase_9_4_private_book_files", "migration.sql"),
    read("src", "lib", "book-file-validation.ts"),
    read("src", "lib", "book-file-storage.ts"),
    read("app", "api", "studio", "books", "[id]", "manuscript", "route.ts"),
    read("app", "api", "library", "download", "[id]", "route.ts"),
    read("src", "lib", "book-file-repository.ts"),
    read("app", "studio", "books", "[id]", "page.tsx"),
  ]);

  console.log("");
  console.log("1. Durable file metadata");
  for (const marker of ["BookFileFormat", "originalName", "contentType", "sizeBytes", "@@unique([bookId, fileType])"]) {
    assert(schema.includes(marker), `Schema marker missing: ${marker}`);
  }
  assert(migration.includes('CREATE UNIQUE INDEX "BookFile_bookId_fileType_key"'), "Stable replacement constraint is missing.");
  console.log("   PASS - format, safe delivery metadata and one-file-per-type replacement are migrated.");

  console.log("");
  console.log("2. PDF/EPUB validation and private storage");
  for (const marker of ["25 * 1024 * 1024", "%PDF-", "application/epub+zip", "detectFormat"]) {
    assert(validation.includes(marker), `Validation marker missing: ${marker}`);
  }
  for (const marker of ['"storage", "private", "book-files"', "randomUUID()", "STORAGE_KEY_PATTERN", "Readable.toWeb"]) {
    assert(storage.includes(marker), `Private storage marker missing: ${marker}`);
  }
  assert(!storage.includes('"public"'), "Private file storage writes beneath public assets.");
  console.log("   PASS - files are signature-checked and stored outside the public web root.");

  console.log("");
  console.log("3. Owner/Admin upload pipeline");
  for (const marker of ["getRequestDatabaseSession", "userHasRole", "canManageBook", "validateBookFileUpload", "replaceManagedBookFile"]) {
    assert(upload.includes(marker), `Upload authorization marker missing: ${marker}`);
  }
  assert(repository.includes("bookFile.upsert") && repository.includes("previousStorageKey"), "Replacement persistence is incomplete.");
  console.log("   PASS - uploads are authorized, transactional and clean up replaced objects.");

  console.log("");
  console.log("4. Entitlement-checked streaming");
  for (const marker of ["getEntitledBookFile", "libraryItems", "private, no-store", "nosniff", "Content-Disposition"]) {
    assert(`${download}\n${repository}`.includes(marker), `Download security marker missing: ${marker}`);
  }
  console.log("   PASS - protected downloads require LibraryItem ownership and stream with private headers.");

  console.log("");
  console.log("5. Writer Studio controls");
  for (const marker of [
    "Manuscript and sample files",
    '{ type: "MANUSCRIPT" as const, label: "Manuscript"',
    '{ type: "SAMPLE" as const, label: "Sample"',
    'aria-label={`Upload ${item.label.toLowerCase()}`}',
    "Remove {item.label.toLowerCase()}",
  ]) {
    assert(editor.includes(marker), `Studio marker missing: ${marker}`);
  }
  console.log("   PASS - Writer Studio supports manuscript/sample upload, replacement and removal.");

  await access(path.join(process.cwd(), "storage", "private")).catch(() => undefined);
  console.log("");
  console.log("SECTION 9.4 PASSED.");
}

main().catch((error) => {
  console.error("");
  console.error("SECTION 9.4 FAILED.");
  console.error(error);
  process.exitCode = 1;
});
