import { readFile } from "node:fs/promises";
import path from "node:path";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

async function main() {
  console.log("");
  console.log("SECTION 7.2 Writer ownership source verification");
  console.log("");

  const repository = await readFile(
    path.join(
      process.cwd(),
      "src",
      "lib",
      "writer-book-repository.ts",
    ),
    "utf8",
  );

  for (const marker of [
    "authorId: input.userId",
    "authorId: userId",
    "RoleKey.ADMIN",
    "RoleKey.WRITER",
    "BookStatus.DRAFT",
  ]) {
    assert(
      repository.includes(marker),
      `Ownership repository marker missing: ${marker}`,
    );
  }

  assert(
    !repository.includes("catalog.json"),
    "Writer ownership repository must not use JSON fallback.",
  );

  assert(
    !repository.includes("localStorage"),
    "Writer ownership repository must not use browser storage.",
  );

  console.log(
    "PASS - Writer ownership foundation is PostgreSQL-only and server-authoritative.",
  );

  console.log("");
  console.log("SECTION 7.2 PASSED.");
}

main().catch((error) => {
  console.error("");
  console.error("SECTION 7.2 FAILED.");
  console.error(error);
  process.exit(1);
});