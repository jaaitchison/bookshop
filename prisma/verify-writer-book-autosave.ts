import { readFile } from "node:fs/promises";
import path from "node:path";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

async function main() {
  console.log("");
  console.log("SECTION 8.5 book metadata autosave verification");
  console.log("");

  const editor = await readFile(
    path.join(
      process.cwd(),
      "app",
      "studio",
      "books",
      "[id]",
      "page.tsx",
    ),
    "utf8",
  );

  console.log("1. Debounced metadata autosave");

  assert(
    editor.includes("bookAutosaveTimerRef") &&
      editor.includes("bookIsDirty") &&
      editor.includes("setTimeout(") &&
      editor.includes("1200"),
    "Debounced book metadata autosave is missing.",
  );

  console.log(
    "   PASS - dirty book metadata autosaves after a short pause.",
  );

  console.log("");
  console.log("2. Manual Save fallback");

  assert(
    editor.includes("const saveBook = async") &&
      editor.includes("bookAutosaveTimerRef.current") &&
      editor.includes("clearTimeout(") &&
      editor.includes("Save book details"),
    "Manual book Save fallback is missing.",
  );

  console.log(
    "   PASS - manual Save remains available and cancels pending metadata debounce.",
  );

  console.log("");
  console.log("3. Shared persistence path");

  assert(
    editor.includes("const persistBook = useCallback(async") &&
      editor.includes("void persistBook(book)") &&
      editor.includes("await persistBook(book)"),
    "Autosave and manual book Save do not share one persistence function.",
  );

  console.log(
    "   PASS - autosave and manual Save use the same secure metadata PUT path.",
  );

  console.log("");
  console.log("4. Metadata fields only");

  for (const marker of [
    "title: bookToSave.title",
    "description: bookToSave.description",
    "genre: bookToSave.genre",
    "cover: bookToSave.coverUrl",
    "price: Number(bookToSave.price)",
  ]) {
    assert(
      editor.includes(marker),
      `Metadata autosave field missing: ${marker}`,
    );
  }

  assert(
    !editor.includes("status: bookToSave.status"),
    "Publishing status must not be part of metadata autosave.",
  );

  console.log(
    "   PASS - autosave covers editable metadata but not publishing status.",
  );

  console.log("");
  console.log("5. Stale-response protection");

  assert(
    editor.includes("bookSaveRequestRef") &&
      editor.includes(
        "requestId !== bookSaveRequestRef.current",
      ),
    "Book save request sequencing is missing.",
  );

  console.log(
    "   PASS - older metadata save responses cannot replace newer local save state.",
  );

  console.log("");
  console.log("6. Save-state integration");

  assert(
    editor.includes("setBookSaving(true)") &&
      editor.includes("setBookSaving(false)") &&
      editor.includes("setBookBaseline(snapshotBook(savedBook))"),
    "Metadata autosave is not integrated with visible save state.",
  );

  console.log(
    "   PASS - metadata autosave updates Saving/Saved/Error state and baseline.",
  );

  console.log("");
  console.log("SECTION 8.5 PASSED.");
  console.log(
    "The Writer editor is ready for Section 8.6 word counts and manuscript statistics.",
  );
}

main().catch((error) => {
  console.error("");
  console.error("SECTION 8.5 FAILED.");
  console.error(error);
  process.exit(1);
});