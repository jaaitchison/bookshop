import { readFile } from "node:fs/promises";
import path from "node:path";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

async function main() {
  console.log("");
  console.log("SECTION 7.5 secure update source verification");
  console.log("");

  const route = await readFile(
    path.join(
      process.cwd(),
      "app",
      "api",
      "books",
      "[id]",
      "route.ts",
    ),
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
    route.includes("canManageBook(session.userId, id)"),
    "PUT route does not enforce owner-or-Admin authorization.",
  );

  assert(
    route.includes("updateManagedBookMetadata"),
    "PUT route does not use secure ownership repository.",
  );

  assert(
    !route.includes("updateCatalogBook"),
    "PUT route still uses broad JSON-mirroring catalogue update.",
  );

  for (const forbidden of [
    "rating: body.rating",
    "reviews: body.reviews",
    "featured: body.featured",
    "new: body.new",
    "author: body.author",
    "authorId: body.authorId",
    "...body",
  ]) {
    assert(
      !route.includes(forbidden),
      `PUT route still trusts protected client field: ${forbidden}`,
    );
  }

  for (const marker of [
    "publishedAt",
    "archivedAt",
    "BookStatus.PUBLISHED",
    "BookStatus.ARCHIVED",
    "BookStatus.DRAFT",
  ]) {
    assert(
      repository.includes(marker),
      `Publishing transition marker missing: ${marker}`,
    );
  }

  console.log(
    "PASS - metadata edits are owner-authorized and publishing timestamps are server-controlled.",
  );

  console.log("");
  console.log("SECTION 7.5 PASSED.");
}

main().catch((error) => {
  console.error("");
  console.error("SECTION 7.5 FAILED.");
  console.error(error);
  process.exit(1);
});