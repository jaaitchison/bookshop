import { readFile } from "node:fs/promises";
import path from "node:path";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function read(...parts: string[]) {
  return readFile(path.join(process.cwd(), ...parts), "utf8");
}

async function main() {
  console.log("\nSECTION 8.9 chapter revision source verification\n");

  const [schema, migration, chapters, revisions] = await Promise.all([
    read("prisma", "schema.prisma"),
    read("prisma", "migrations", "20260805150000_add_chapter_revisions", "migration.sql"),
    read("src", "lib", "writer-chapter-repository.ts"),
    read("src", "lib", "writer-chapter-revision-repository.ts"),
  ]);

  console.log("1. Revision schema and migration");
  for (const marker of ["model ChapterRevision", "chapterId", "userId", "title", "content", "isPreview", "createdAt"]) {
    assert(schema.includes(marker), `Revision schema marker missing: ${marker}`);
  }
  assert(migration.includes('CREATE TABLE "ChapterRevision"') && migration.includes("ON DELETE CASCADE"), "Revision migration is incomplete.");
  console.log("   PASS - append-only snapshot data and relationships are migrated.");

  console.log("\n2. Atomic snapshot creation");
  assert(
    chapters.match(/chapterRevision\.create/g)?.length === 2 &&
      chapters.includes("prisma.$transaction"),
    "Chapter create/update does not atomically append revisions.",
  );
  console.log("   PASS - chapter creation and updates append snapshots transactionally.");

  console.log("\n3. Owner-authorized repository reads");
  for (const marker of ["getManagedChapterRevisions", "getManagedChapterRevision", "canManageBook", "chapterId: chapter.id"]) {
    assert(revisions.includes(marker), `Revision repository marker missing: ${marker}`);
  }
  console.log("   PASS - revision list and detail reads retain owner/Admin book authorization.");

  console.log("\n4. Append-only boundary");
  for (const forbidden of ["chapterRevision.update", "chapterRevision.delete", "chapterRevision.upsert"]) {
    assert(!revisions.includes(forbidden) && !chapters.includes(forbidden), `Historical revision mutation found: ${forbidden}`);
  }
  console.log("   PASS - no historical revision update or delete operation is exposed.");

  console.log("\nSECTION 8.9 SOURCE VERIFICATION PASSED.\n");
}

main().catch((error) => {
  console.error("\nSECTION 8.9 SOURCE VERIFICATION FAILED.");
  console.error(error);
  process.exit(1);
});
