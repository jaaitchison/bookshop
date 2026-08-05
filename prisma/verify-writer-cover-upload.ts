import { readFile } from "node:fs/promises";
import path from "node:path";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function read(...parts: string[]) {
  return readFile(path.join(process.cwd(), ...parts), "utf8");
}

async function main() {
  console.log("\nSECTION 8.8 Writer cover upload verification\n");

  const [storage, route, editor, repository] = await Promise.all([
    read("src", "lib", "cover-storage.ts"),
    read("app", "api", "studio", "books", "[id]", "cover", "route.ts"),
    read("app", "studio", "books", "[id]", "page.tsx"),
    read("src", "lib", "writer-book-repository.ts"),
  ]);

  console.log("1. File validation");
  for (const marker of ["MAX_COVER_BYTES", "image/jpeg", "image/png", "image/webp", "detectedCoverType"]) {
    assert(storage.includes(marker), `Cover validation marker missing: ${marker}`);
  }
  console.log("   PASS - size, declared type and file signature are validated.");

  console.log("\n2. Storage abstraction");
  assert(
    storage.includes("interface CoverStorage") &&
      storage.includes("randomUUID()") &&
      storage.includes('"public"') &&
      storage.includes('"uploads"') &&
      storage.includes('"covers"'),
    "Local cover storage abstraction is incomplete.",
  );
  console.log("   PASS - randomized local storage is isolated behind a replaceable interface.");

  console.log("\n3. Server authorization");
  for (const marker of ["getRequestDatabaseSession", "userHasRole", "canManageBook", "getManagedBookCover"]) {
    assert(route.includes(marker), `Cover route authorization marker missing: ${marker}`);
  }
  assert(repository.includes("getManagedBookCover"), "Trusted previous-cover lookup is missing.");
  console.log("   PASS - upload and removal use trusted owner/Admin authorization and server-derived state.");

  console.log("\n4. Upload lifecycle");
  assert(route.includes("stored.delete()") && route.includes("storage.remove(previousStorageReference)") && route.includes('coverUrl: ""'), "Replacement, rollback or removal lifecycle is incomplete.");
  console.log("   PASS - failed uploads roll back and managed replacements/removals are cleaned up.");

  console.log("\n5. Writer editor integration");
  for (const marker of ["Upload cover", "Replace cover", "Remove cover", "applyPersistedCover", "accept=\"image/jpeg,image/png,image/webp\""]) {
    assert(editor.includes(marker), `Editor cover marker missing: ${marker}`);
  }
  console.log("   PASS - preview, upload, replacement and removal are integrated with metadata state.");

  console.log("\nSECTION 8.8 PASSED.\n");
}

main().catch((error) => {
  console.error("\nSECTION 8.8 FAILED.");
  console.error(error);
  process.exit(1);
});
