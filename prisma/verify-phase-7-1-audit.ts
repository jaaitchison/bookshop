import { readFile } from "node:fs/promises";
import path from "node:path";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

async function read(relativePath: string): Promise<string> {
  return readFile(path.join(process.cwd(), relativePath), "utf8");
}

async function main() {
  console.log("");
  console.log("SECTION 7.1 catalogue and Writer Studio audit verification");
  console.log("");

  const schema = await read("prisma/schema.prisma");
  const catalogue = await read("src/lib/catalog-data.ts");
  const booksRoute = await read("app/api/books/route.ts");
  const bookRoute = await read("app/api/books/[id]/route.ts");
  const studio = await read("app/studio/page.tsx");
  const documentation = await read(
    "docs/PHASE-7-1-CATALOGUE-STUDIO-AUDIT.md",
  );

  console.log("1. Schema readiness");

  for (const marker of [
    "model WriterProfile",
    "authorId",
    "authoredBooks",
    "model Chapter",
    "@@unique([bookId, chapterNo])",
  ]) {
    assert(
      schema.includes(marker),
      `Schema readiness marker missing: ${marker}`,
    );
  }

  console.log(
    "   PASS - schema contains the core ownership and chapter structures.",
  );

  console.log("");
  console.log("2. Current ownership gap recorded");

  assert(
    !catalogue.includes("authorId:"),
    "Audit assumption changed: catalogue creation now appears to assign authorId.",
  );
  assert(
    booksRoute.includes('includeDrafts'),
    "Audit assumption changed: includeDrafts route no longer exists.",
  );
  if (bookRoute.includes("session.userId")) {
    console.log(
      "   PASS - book mutation route now contains ownership-aware logic.",
    );
  } else {
    console.log(
      "   INFO - book mutation route is still role-only and needs owner checks.",
    );
  }

  console.log(
    "   PASS - remaining ownership gaps are still captured by the audit.",
  );

  console.log("");
  console.log("3. Destructive chapter replacement recorded");

  assert(
    catalogue.includes("tx.chapter.deleteMany"),
    "Audit assumption changed: destructive chapter replacement was not found.",
  );

  console.log(
    "   PASS - current chapter replacement behaviour is confirmed.",
  );

  console.log("");
  console.log("4. Prototype Studio data recorded");

  assert(
    studio.includes("1200 + index * 260"),
    "Audit assumption changed: placeholder Studio view data was not found.",
  );
  assert(
    studio.includes("getRecentActivities"),
    "Audit assumption changed: static Studio activity source was not found.",
  );

  console.log(
    "   PASS - placeholder Studio analytics and activity are confirmed.",
  );

  console.log("");
  console.log("5. Audit documentation");

  for (const heading of [
    "Writer ownership is not enforced",
    "Book mutation authorization is partially implemented",
    "Chapter editing is destructive",
    "Recommended Phase 7 sequence",
  ]) {
    assert(
      documentation.includes(heading),
      `Audit documentation section missing: ${heading}`,
    );
  }

  console.log(
    "   PASS - Phase 7 risks and implementation order are documented.",
  );

  console.log("");
  console.log("SECTION 7.1 PASSED.");
  console.log(
    "The project is ready to begin the Writer ownership foundation.",
  );
}

main().catch((error) => {
  console.error("");
  console.error("SECTION 7.1 FAILED.");
  console.error(error);
  process.exit(1);
});