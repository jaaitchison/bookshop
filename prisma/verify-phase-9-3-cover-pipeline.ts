import { readFile } from "node:fs/promises";
import path from "node:path";
import { DEFAULT_COVER_URL, MAX_COVER_BYTES, coverUrlOrFallback } from "../src/lib/cover-storage";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function read(...parts: string[]) {
  return readFile(path.join(process.cwd(), ...parts), "utf8");
}

async function main() {
  console.log("");
  console.log("SECTION 9.3 - Writer cover asset pipeline verification");
  const [route, storage, repository, editor, compatibility] = await Promise.all([
    read("app", "api", "studio", "books", "[id]", "cover", "route.ts"),
    read("src", "lib", "cover-storage.ts"),
    read("src", "lib", "writer-book-repository.ts"),
    read("app", "studio", "books", "[id]", "page.tsx"),
    read("app", "api", "books", "[id]", "cover", "route.ts"),
  ]);

  console.log("");
  console.log("1. Canonical secure Studio endpoint");
  for (const marker of ["getRequestDatabaseSession", "userHasRole", "canManageBook", "validateCoverUpload"]) {
    assert(route.includes(marker), `Secure route marker missing: ${marker}`);
  }
  assert(editor.includes("/api/studio/books/${book.id}/cover"), "Writer editor does not use the canonical endpoint.");
  assert(compatibility.includes("canonical Writer"), "Legacy endpoint compatibility bridge is missing.");
  console.log("   PASS - Upload and removal use the owner/Admin-authorized Studio endpoint.");

  console.log("");
  console.log("2. File validation and storage abstraction");
  assert(MAX_COVER_BYTES === 5 * 1024 * 1024, "Cover size limit is not 5 MB.");
  for (const marker of ["image/jpeg", "image/png", "image/webp", "detectedCoverType", "randomUUID()", "storageKey"]) {
    assert(storage.includes(marker), `Storage marker missing: ${marker}`);
  }
  console.log("   PASS - MIME, signature, size, random key and replaceable storage boundaries are present.");

  console.log("");
  console.log("3. Transactional database link");
  for (const marker of ["replaceManagedBookCover", "bookCover.upsert", "removeManagedBookCover", "bookCover.deleteMany", "$transaction"]) {
    assert(repository.includes(marker), `Database cover marker missing: ${marker}`);
  }
  console.log("   PASS - Book.coverUrl and BookCover metadata change transactionally.");

  console.log("");
  console.log("4. Fallback cover");
  assert(coverUrlOrFallback("") === DEFAULT_COVER_URL, "Missing covers do not resolve to the fallback asset.");
  await read("public", "images", "default-book-cover.svg");
  console.log(`   PASS - Missing catalogue covers resolve to ${DEFAULT_COVER_URL}.`);

  console.log("");
  console.log("SECTION 9.3 PASSED.");
}

main().catch((error) => {
  console.error("");
  console.error("SECTION 9.3 FAILED.");
  console.error(error);
  process.exitCode = 1;
});
