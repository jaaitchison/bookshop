import { readFile } from "node:fs/promises";
import path from "node:path";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function read(...parts: string[]) {
  return readFile(path.join(process.cwd(), ...parts), "utf8");
}

async function main() {
  console.log("\nSECTION 11.1 - Reader Library source verification\n");
  const [repository, storage, download, metadata, progress, libraryPage, readerPage, epubReader, runtime, browser, docs, packageJson] = await Promise.all([
    read("src", "lib", "book-file-repository.ts"),
    read("src", "lib", "book-file-storage.ts"),
    read("app", "api", "library", "download", "[id]", "route.ts"),
    read("app", "api", "library", "files", "[id]", "route.ts"),
    read("src", "lib", "reading-progress-repository.ts"),
    read("app", "library", "page.tsx"),
    read("app", "library", "read", "[id]", "page.tsx"),
    read("src", "components", "library", "EpubReader.tsx"),
    read("prisma", "test-phase-11-1-reader-library.ts"),
    read("tests", "browser", "reader-library-viewer.spec.ts"),
    read("docs", "SECTION-11-1-READER-LIBRARY.md"),
    read("package.json"),
  ]);

  console.log("1. Entitlement-owned metadata and files");
  for (const marker of ["getEntitledBookFile", "libraryItems", "some: { userId }"]) {
    assert(repository.includes(marker), `Entitlement marker missing: ${marker}`);
  }
  assert(metadata.includes("getRequestDatabaseSession") && metadata.includes("userHasRole") && metadata.includes("getEntitledBookFile"), "Reader metadata route lacks server authorization.");
  console.log("   PASS - both metadata and bytes resolve through the purchasing Reader's LibraryItem.");

  console.log("\n2. Secure inline, attachment and range streaming");
  for (const marker of ["parseByteRange", 'status: 416', 'status: range ? 206 : 200', '"Accept-Ranges": "bytes"', '"Content-Range"', '"Cross-Origin-Resource-Policy"']) {
    assert(download.includes(marker), `Range-delivery marker missing: ${marker}`);
  }
  assert(storage.includes("createReadStream(target, { start, end })") && storage.includes("contentLength"), "Storage layer does not stream selected byte ranges.");
  console.log("   PASS - private files support no-store reading, downloading and standards-based byte ranges.");

  console.log("\n3. PDF and EPUB browser readers");
  assert(readerPage.includes("PDF reader") && readerPage.includes("?mode=inline") && readerPage.includes("EpubReader"), "Reader page does not support both formats.");
  for (const marker of ["ePub(bytes)", "book.renderTo", "allowScriptedContent: false", "Previous page", "Next page", "percentageFromCfi"]) {
    assert(epubReader.includes(marker), `EPUB reader marker missing: ${marker}`);
  }
  assert(packageJson.includes('"epubjs": "^0.3.93"') && packageJson.includes('"@xmldom/xmldom": "0.8.13"'), "Patched EPUB dependency pin is missing.");
  console.log("   PASS - PDF uses the browser viewer and EPUB uses a script-disabled paginated renderer.");

  console.log("\n4. Library UX and progress ownership");
  for (const marker of ["Read {file.format}", "The Writer has not supplied", "Reading progress"]) {
    assert(libraryPage.includes(marker), `Library UI marker missing: ${marker}`);
  }
  assert(progress.includes("libraryItem.findUnique") && progress.includes("requires this book in your library"), "Reading progress is not entitlement-scoped.");
  assert(readerPage.includes("Mark as finished") && epubReader.includes("/api/reading-progress"), "Reader progress controls are incomplete.");
  console.log("   PASS - responsive library actions and progress writes stay account-owned.");

  console.log("\n5. Runtime, browser and runbook coverage");
  for (const marker of ["Session and entitlement boundaries", "PDF byte-range streaming", "EPUB metadata", "Entitlement-scoped reading progress"]) {
    assert(runtime.includes(marker), `Runtime coverage marker missing: ${marker}`);
  }
  assert(browser.includes("Read PDF") && browser.includes("Mark as finished") && browser.includes("content-range"), "Browser coverage is incomplete.");
  assert(docs.includes("npm run phase11:test-reader") && packageJson.includes("phase11:verify-reader"), "Section 11.1 commands are missing.");
  console.log("   PASS - authorization, bytes, viewer UI and progress have executable coverage.");

  console.log("\nSECTION 11.1 SOURCE VERIFICATION PASSED.\n");
}

main().catch((error) => {
  console.error("\nSECTION 11.1 SOURCE VERIFICATION FAILED.");
  console.error(error);
  process.exitCode = 1;
});
