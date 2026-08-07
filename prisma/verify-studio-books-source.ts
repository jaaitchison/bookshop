import { readFile } from "node:fs/promises";
import path from "node:path";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

async function main() {
  console.log("");
  console.log("SECTION 7.3 Writer Studio source verification");
  console.log("");

  const studio = await readFile(
    path.join(process.cwd(), "app", "studio", "page.tsx"),
    "utf8",
  );

  const route = await readFile(
    path.join(
      process.cwd(),
      "app",
      "api",
      "studio",
      "books",
      "route.ts",
    ),
    "utf8",
  );

  assert(
    studio.includes("/api/studio/books"),
    "Writer Studio does not use dedicated Studio books API.",
  );

  assert(
    !studio.includes("/api/books?includeDrafts=true"),
    "Writer Studio still loads the broad catalogue draft endpoint.",
  );

  assert(
    route.includes("getWriterOwnedBooks(session.userId)"),
    "Studio API does not scope ordinary listing to authenticated userId.",
  );

  assert(
    route.includes('scope === "all"') &&
      route.includes("isAdmin"),
    "Explicit Admin all-books scope is missing.",
  );

  console.log(
    "PASS - Writer Studio uses owner-only API and broad inspection is explicit Admin-only.",
  );

  console.log("");
  console.log("SECTION 7.3 PASSED.");
}

main().catch((error) => {
  console.error("");
  console.error("SECTION 7.3 FAILED.");
  console.error(error);
  process.exit(1);
});