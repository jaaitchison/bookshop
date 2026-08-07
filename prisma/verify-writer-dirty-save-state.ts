import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  resolveWriterSaveState,
  writerSaveStateLabel,
} from "../src/lib/writer-save-state";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

async function main() {
  console.log("");
  console.log("SECTION 8.2 dirty-state and save-status verification");
  console.log("");

  console.log("1. Save-state helper");

  assert(
    resolveWriterSaveState({
      isDirty: false,
      isSaving: false,
      hasError: false,
    }) === "saved",
    "Clean state should resolve to saved.",
  );

  assert(
    resolveWriterSaveState({
      isDirty: true,
      isSaving: false,
      hasError: false,
    }) === "unsaved",
    "Dirty state should resolve to unsaved.",
  );

  assert(
    resolveWriterSaveState({
      isDirty: true,
      isSaving: true,
      hasError: false,
    }) === "saving",
    "Saving must take priority over dirty state.",
  );

  assert(
    resolveWriterSaveState({
      isDirty: true,
      isSaving: false,
      hasError: true,
    }) === "error",
    "Save error must be visible.",
  );

  assert(
    writerSaveStateLabel("saved") === "Saved" &&
      writerSaveStateLabel("unsaved") === "Unsaved changes" &&
      writerSaveStateLabel("saving") === "Saving..." &&
      writerSaveStateLabel("error") === "Save failed",
    "Save-state labels are incomplete.",
  );

  console.log(
    "   PASS - shared save-state logic covers Saved, Unsaved, Saving and Save failed.",
  );

  console.log("");
  console.log("2. Book dirty-state baseline");

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

  for (const marker of [
    "BookEditableSnapshot",
    "bookBaseline",
    "bookIsDirty",
    "setBookBaseline(snapshotBook(ownedBook))",
    "setBookBaseline(snapshotBook(savedBook))",
    'data-testid="book-save-state"',
  ]) {
    assert(
      editor.includes(marker),
      `Book dirty-state marker missing: ${marker}`,
    );
  }

  console.log(
    "   PASS - book metadata has a persisted baseline and visible save state.",
  );

  console.log("");
  console.log("3. Chapter dirty-state baseline");

  for (const marker of [
    "ChapterEditableSnapshot",
    "chapterBaselines",
    "selectedChapterIsDirty",
    "snapshotChapter(payload.chapter!)",
    'data-testid="chapter-save-state"',
  ]) {
    assert(
      editor.includes(marker),
      `Chapter dirty-state marker missing: ${marker}`,
    );
  }

  console.log(
    "   PASS - selected chapter has per-chapter baseline tracking and visible save state.",
  );

  console.log("");
  console.log("4. Manual save remains available");

  assert(
    editor.includes("Save book details") &&
      editor.includes("Save chapter"),
    "Section 8.2 must not remove explicit manual save actions.",
  );

  assert(
    editor.includes("bookSaving || !bookIsDirty") &&
      editor.includes(
        "chapterSaving || !selectedChapterIsDirty",
      ),
    "Manual Save controls are not tied to dirty state.",
  );

  console.log(
    "   PASS - explicit Save remains as the only persistence trigger and is enabled only for changed content.",
  );

  console.log("");
  console.log("5. Dirty-state foundation remains compatible");

  assert(
    editor.includes("bookIsDirty") &&
      editor.includes("selectedChapterIsDirty"),
    "Section 8.2 dirty-state signals were removed.",
  );

  console.log(
    "   PASS - Section 8.2 dirty-state foundation remains intact for later autosave/protection layers.",
  );

  console.log("");
  console.log("SECTION 8.2 PASSED.");
  console.log(
    "The Writer editor is ready for Section 8.3 unsaved-change protection.",
  );
}

main().catch((error) => {
  console.error("");
  console.error("SECTION 8.2 FAILED.");
  console.error(error);
  process.exit(1);
});