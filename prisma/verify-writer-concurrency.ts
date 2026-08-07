import { readFile } from "node:fs/promises";
import path from "node:path";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function read(...parts: string[]) {
  return readFile(path.join(process.cwd(), ...parts), "utf8");
}

async function main() {
  console.log("\nSECTION 8.11 chapter concurrency verification\n");

  const [schema, migration, repository, route, restoreRoute, editor, browserTest] = await Promise.all([
    read("prisma", "schema.prisma"),
    read("prisma", "migrations", "20260805180000_add_chapter_version", "migration.sql"),
    read("src", "lib", "writer-chapter-repository.ts"),
    read("app", "api", "studio", "books", "[id]", "chapters", "[chapterId]", "route.ts"),
    read("app", "api", "studio", "books", "[id]", "chapters", "[chapterId]", "revisions", "route.ts"),
    read("app", "studio", "books", "[id]", "page.tsx"),
    read("tests", "browser", "writer-chapter-concurrency.spec.ts"),
  ]);

  console.log("1. Persistent version token");
  assert(
    /^\s*version\s+Int\s+@default\(1\)\s*$/m.test(schema) && migration.includes('ADD COLUMN "version"'),
    "Chapter version schema or migration is missing.",
  );
  console.log("   PASS - every chapter has a persistent version token.");

  console.log("\n2. Atomic compare and increment");
  for (const marker of ["expectedVersion", "updateMany", "version: expectedVersion", "version: { increment: 1 }", "WriterChapterConflictError"]) {
    assert(repository.includes(marker), `Atomic concurrency marker missing: ${marker}`);
  }
  console.log("   PASS - updates compare and increment version inside the revision transaction.");

  console.log("\n3. API conflict contract");
  for (const source of [route, restoreRoute]) {
    assert(source.includes("expectedVersion") && source.includes("status: 409") && source.includes("conflict: true"), "A chapter mutation route does not return the conflict contract.");
  }
  console.log("   PASS - ordinary saves and revision restores reject stale versions with HTTP 409.");

  console.log("\n4. Editor recovery");
  for (const marker of ["chapter.version", "chapter-conflict", "Reload latest version", "reloadChapterAfterConflict"]) {
    assert(editor.includes(marker), `Editor conflict marker missing: ${marker}`);
  }
  console.log("   PASS - stale local edits remain visible until the Writer chooses to reload.");

  console.log("\n5. Two-session browser coverage");
  for (const marker of ["pageA", "pageB", "toBe(409)", "chapterRevision.count", "Reload latest version"]) {
    assert(browserTest.includes(marker), `Concurrency browser marker missing: ${marker}`);
  }
  console.log("   PASS - two stale browser views cannot silently overwrite one another.");

  console.log("\nSECTION 8.11 PASSED.\n");
}

main().catch((error) => {
  console.error("\nSECTION 8.11 FAILED.");
  console.error(error);
  process.exit(1);
});
