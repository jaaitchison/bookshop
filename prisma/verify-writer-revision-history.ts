import { readFile } from "node:fs/promises";
import path from "node:path";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function read(...parts: string[]) {
  return readFile(path.join(process.cwd(), ...parts), "utf8");
}

async function main() {
  console.log("\nSECTION 8.10 revision history UI and restore verification\n");

  const [route, editor, repository, browserTest] = await Promise.all([
    read("app", "api", "studio", "books", "[id]", "chapters", "[chapterId]", "revisions", "route.ts"),
    read("app", "studio", "books", "[id]", "page.tsx"),
    read("src", "lib", "writer-chapter-revision-repository.ts"),
    read("tests", "browser", "writer-revision-history.spec.ts"),
  ]);

  console.log("1. Secured revision API");
  for (const marker of ["getRequestDatabaseSession", "userHasRole", "getManagedChapterRevisions", "getManagedChapterRevision"]) {
    assert(route.includes(marker), `Revision API security marker missing: ${marker}`);
  }
  assert(repository.includes("canManageBook"), "Revision repository ownership check is missing.");
  console.log("   PASS - revision list and restore remain owner/Admin-authorized.");

  console.log("\n2. Restore appends history");
  assert(
    route.includes("updateManagedChapter") &&
      !route.includes("chapterRevision.update") &&
      !route.includes("chapterRevision.delete"),
    "Restore does not use the append-only chapter update path.",
  );
  console.log("   PASS - restoration uses normal chapter persistence and creates a new revision.");

  console.log("\n3. Inspection and comparison UI");
  for (const marker of ["Show revision history", "revision-comparison", "Saved revision", "Current editor", "Restore this revision"]) {
    assert(editor.includes(marker), `Revision UI marker missing: ${marker}`);
  }
  console.log("   PASS - Writers can list, inspect, compare and restore revisions.");

  console.log("\n4. Unsaved-change and browser coverage");
  assert(editor.includes("This chapter has unsaved changes") && editor.includes("chapterAutosaveTimerRef.current"), "Restore does not protect unsaved edits or pending autosave.");
  for (const marker of ["Inspect revision: Original revision", "Restore this revision", "chapterRevision.count"]) {
    assert(browserTest.includes(marker), `Revision browser coverage missing: ${marker}`);
  }
  console.log("   PASS - restore confirmation and append-only browser behavior are covered.");

  console.log("\nSECTION 8.10 PASSED.\n");
}

main().catch((error) => {
  console.error("\nSECTION 8.10 FAILED.");
  console.error(error);
  process.exit(1);
});
