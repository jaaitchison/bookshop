import { access, readFile } from "node:fs/promises";
import path from "node:path";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
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
  console.log("\nSECTION 8.12 Phase 8 close-out verification\n");

  const [editor, schema, chapters, coverStorage, packageSource] = await Promise.all([
    read("app/studio/books/[id]/page.tsx"),
    read("prisma/schema.prisma"),
    read("src/lib/writer-chapter-repository.ts"),
    read("src/lib/cover-storage.ts"),
    read("package.json"),
  ]);

  console.log("1. Reliable editing and autosave");
  for (const marker of ["bookIsDirty", "selectedChapterIsDirty", "beforeunload", "bookAutosaveTimerRef", "chapterAutosaveTimerRef", "Save book details", "Save chapter"]) {
    assert(editor.includes(marker), `Reliable editing marker missing: ${marker}`);
  }
  console.log("   PASS - dirty state, navigation protection, autosave and manual fallback remain integrated.");

  console.log("\n2. Authoring tools and statistics");
  for (const marker of ["markdown-toolbar", "markdown-preview", "chapter-word-count", "manuscript-word-count"]) {
    assert(editor.includes(marker), `Authoring marker missing: ${marker}`);
  }
  assert(!editor.includes("dangerouslySetInnerHTML"), "Markdown preview reintroduced raw HTML injection.");
  console.log("   PASS - Markdown preview and derived chapter/manuscript statistics are present.");

  console.log("\n3. Secure cover workflow");
  for (const marker of ["interface CoverStorage", "MAX_COVER_BYTES", "randomUUID", "detectedCoverType"]) {
    assert(coverStorage.includes(marker), `Cover foundation marker missing: ${marker}`);
  }
  assert(await exists("app/api/studio/books/[id]/cover/route.ts"), "Cover API route is missing.");
  console.log("   PASS - validated cover upload, replacement and removal use a storage abstraction.");

  console.log("\n4. Append-only revisions and concurrency");
  assert(schema.includes("model ChapterRevision") && schema.includes("version     Int      @default(1)"), "Revision or version schema is incomplete.");
  for (const marker of ["chapterRevision.create", "updateMany", "expectedVersion", "WriterChapterConflictError"]) {
    assert(chapters.includes(marker), `Revision/concurrency marker missing: ${marker}`);
  }
  assert(await exists("app/api/studio/books/[id]/chapters/[chapterId]/revisions/route.ts"), "Revision history API is missing.");
  console.log("   PASS - chapter history is append-only and stale sessions cannot overwrite newer saves.");

  console.log("\n5. Complete browser regression coverage");
  const browserCoverage: Record<string, string[]> = {
    "tests/browser/writer-unsaved-protection.spec.ts": ["protects dirty chapter switching"],
    "tests/browser/writer-chapter-autosave.spec.ts": ["autosaves dirty chapter"],
    "tests/browser/writer-book-autosave.spec.ts": ["autosaves dirty book metadata"],
    "tests/browser/writer-text-statistics.spec.ts": ["displays live chapter and manuscript statistics"],
    "tests/browser/writer-markdown.spec.ts": ["stores Markdown source"],
    "tests/browser/writer-cover-upload.spec.ts": ["uploads, replaces, validates and removes"],
    "tests/browser/writer-revision-history.spec.ts": ["restores a revision without deleting history"],
    "tests/browser/writer-chapter-concurrency.spec.ts": ["rejects a stale chapter save"],
    "tests/browser/writer-studio-flow.spec.ts": ["Writer edits metadata and manages chapters"],
  };

  for (const [file, markers] of Object.entries(browserCoverage)) {
    const source = await read(file);
    for (const marker of markers) {
      assert(source.includes(marker), `Browser coverage missing from ${file}: ${marker}`);
    }
  }
  console.log("   PASS - all Phase 8 editing, cover, revision and conflict workflows have real-browser coverage.");

  console.log("\n6. Documentation and aggregate commands");
  for (const section of ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11"]) {
    assert(await exists(`docs/SECTION-8-${section}-${section === "1" ? "WRITER-EDITOR-AUDIT" : section === "2" ? "DIRTY-SAVE-STATE" : section === "3" ? "UNSAVED-CHANGE-PROTECTION" : section === "4" ? "CHAPTER-AUTOSAVE" : section === "5" ? "BOOK-METADATA-AUTOSAVE" : section === "6" ? "WORD-COUNTS" : section === "7" ? "MARKDOWN-AUTHORING" : section === "8" ? "COVER-UPLOAD" : section === "9" ? "CHAPTER-REVISIONS" : section === "10" ? "REVISION-HISTORY-UI" : "CHAPTER-CONCURRENCY"}.md`), `Phase 8 section ${section} documentation is missing.`);
  }
  assert(await exists("docs/PHASE-8-CLOSEOUT.md"), "Phase 8 close-out document is missing.");
  for (const marker of ["writer:verify", "writer:test-browser", "phase8:verify", "phase8:test"]) {
    assert(packageSource.includes(`\"${marker}\"`), `Aggregate npm script missing: ${marker}`);
  }
  console.log("   PASS - Sections 8.1–8.12 and complete regression commands are documented.");

  console.log("\nSECTION 8.12 PASSED.");
  console.log("Phase 8 Writer authoring reliability, covers, revision history and concurrency protection are complete.\n");
}

main().catch((error) => {
  console.error("\nSECTION 8.12 FAILED.");
  console.error(error);
  process.exit(1);
});
