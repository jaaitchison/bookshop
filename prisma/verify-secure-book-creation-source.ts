import { readFile } from "node:fs/promises";
import path from "node:path";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

async function main() {
  console.log("");
  console.log("SECTION 7.4 secure creation source verification");
  console.log("");

  const route = await readFile(
    path.join(process.cwd(), "app", "api", "books", "route.ts"),
    "utf8",
  );

  const repository = await readFile(
    path.join(
      process.cwd(),
      "src",
      "lib",
      "writer-book-repository.ts",
    ),
    "utf8",
  );

  assert(
    route.includes("createWriterOwnedDraft"),
    "Book create route does not use Writer ownership repository.",
  );

  assert(
    route.includes("userId: session.userId"),
    "Book create route does not derive authorId from session.",
  );

  for (const forbidden of [
    "author: body.author",
    "rating: body.rating",
    "reviews: body.reviews",
    "featured: body.featured",
    "new: body.new",
    "status: body.status",
  ]) {
    assert(
      !route.includes(forbidden),
      `Book create route still trusts client field: ${forbidden}`,
    );
  }

  assert(
    repository.includes("createUniqueBookSlug"),
    "Unique slug generation is missing.",
  );

  assert(
    repository.includes("BookStatus.DRAFT"),
    "Writer draft creation is not Draft-by-default.",
  );

  console.log(
    "PASS - live book creation is session-owned and server-controlled.",
  );

  console.log("");
  console.log("SECTION 7.4 PASSED.");
}

main().catch((error) => {
  console.error("");
  console.error("SECTION 7.4 FAILED.");
  console.error(error);
  process.exit(1);
});