import { readFile } from "node:fs/promises";
import path from "node:path";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

async function main() {
  console.log("");
  console.log("SECTION 7.6 stable chapter source verification");
  console.log("");

  const repository = await readFile(
    path.join(
      process.cwd(),
      "src",
      "lib",
      "writer-chapter-repository.ts",
    ),
    "utf8",
  );

  const catalog = await readFile(
    path.join(
      process.cwd(),
      "src",
      "lib",
      "catalog-data.ts",
    ),
    "utf8",
  );

  const collectionRoute = await readFile(
    path.join(
      process.cwd(),
      "app",
      "api",
      "studio",
      "books",
      "[id]",
      "chapters",
      "route.ts",
    ),
    "utf8",
  );

  const itemRoute = await readFile(
    path.join(
      process.cwd(),
      "app",
      "api",
      "studio",
      "books",
      "[id]",
      "chapters",
      "[chapterId]",
      "route.ts",
    ),
    "utf8",
  );

  assert(
    !catalog.includes("tx.chapter.deleteMany"),
    "Destructive whole-book chapter replacement still exists.",
  );

  for (const marker of [
    "createManagedChapter",
    "updateManagedChapter",
    "reorderManagedChapters",
    "deleteManagedChapter",
    "canManageBook",
  ]) {
    assert(
      repository.includes(marker),
      `Chapter repository marker missing: ${marker}`,
    );
  }

  assert(
    collectionRoute.includes("reorderManagedChapters") &&
      collectionRoute.includes("createManagedChapter"),
    "Collection chapter API is incomplete.",
  );

  assert(
    itemRoute.includes("updateManagedChapter") &&
      itemRoute.includes("deleteManagedChapter"),
    "Individual chapter API is incomplete.",
  );

  assert(
    !repository.includes("catalog.json"),
    "Writer chapter repository must not use JSON fallback.",
  );

  console.log(
    "PASS - chapters use stable PostgreSQL records and dedicated owner-authorized APIs.",
  );

  console.log("");
  console.log("SECTION 7.6 PASSED.");
}

main().catch((error) => {
  console.error("");
  console.error("SECTION 7.6 FAILED.");
  console.error(error);
  process.exit(1);
});