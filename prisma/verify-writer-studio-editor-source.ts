import { readFile } from "node:fs/promises";
import path from "node:path";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

async function read(relativePath: string) {
  return readFile(path.join(process.cwd(), relativePath), "utf8");
}

async function main() {
  console.log("");
  console.log("SECTION 7.7 Writer Studio editor source verification");
  console.log("");

  const studio = await read("app/studio/page.tsx");
  const newBook = await read("app/studio/new/page.tsx");
  const editor = await read("app/studio/books/[id]/page.tsx");
  const bookList = await read(
    "src/components/studio/WriterBooksList.tsx",
  );

  console.log("1. Create-book workflow");

  assert(
    studio.includes('href="/studio/new"'),
    "Studio Write book action does not open the real create page.",
  );
  assert(
    newBook.includes('fetch("/api/books"') &&
      newBook.includes('method: "POST"'),
    "New-book page does not use secure creation API.",
  );
  assert(
    newBook.includes("Create Draft"),
    "New-book UI does not present Draft creation.",
  );

  console.log(
    "   PASS - Writer can open and submit a real Draft creation form.",
  );

  console.log("");
  console.log("2. Owned-book editor navigation");

  assert(
    bookList.includes('href={`/studio/books/${book.id}`}'),
    "Writer book list does not expose Edit navigation.",
  );

  console.log(
    "   PASS - owned books link into the Writer editor.",
  );

  console.log("");
  console.log("3. Secure metadata and status APIs");

  assert(
    editor.includes('fetch(`/api/books/${book.id}`') &&
      editor.includes('method: "PUT"'),
    "Editor does not use secure metadata/status update API.",
  );

  for (const status of [
    'changeStatus("draft")',
    'changeStatus("published")',
    'changeStatus("archived")',
  ]) {
    assert(
      editor.includes(status),
      `Publishing action missing: ${status}`,
    );
  }

  console.log(
    "   PASS - metadata and publishing actions use Section 7.5 API.",
  );

  console.log("");
  console.log("4. Stable chapter workflow");

  for (const marker of [
    "/chapters",
    'method: "POST"',
    'method: "PATCH"',
    'method: "PUT"',
    'method: "DELETE"',
    "isPreview",
    "chapterIds",
  ]) {
    assert(
      editor.includes(marker),
      `Editor chapter workflow marker missing: ${marker}`,
    );
  }

  assert(
    !editor.includes("manuscriptChapters"),
    "Editor still uses destructive manuscriptChapters workflow.",
  );

  console.log(
    "   PASS - editor uses stable Section 7.6 chapter APIs.",
  );

  console.log("");
  console.log("SECTION 7.7 PASSED.");
}

main().catch((error) => {
  console.error("");
  console.error("SECTION 7.7 FAILED.");
  console.error(error);
  process.exit(1);
});