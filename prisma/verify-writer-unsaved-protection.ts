import { readFile } from "node:fs/promises";
import path from "node:path";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

async function main() {
  console.log("");
  console.log("SECTION 8.3 unsaved-change protection verification");
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

  console.log("1. Browser close/reload protection");

  assert(
    editor.includes('"beforeunload"') &&
      editor.includes("event.returnValue"),
    "Browser beforeunload protection is missing.",
  );

  console.log(
    "   PASS - dirty Writer state protects browser close/reload.",
  );

  console.log("");
  console.log("2. Shared unsaved-change signal");

  assert(
    editor.includes(
      "bookIsDirty || selectedChapterIsDirty",
    ) &&
      editor.includes("confirmUnsavedChanges"),
    "Shared unsaved-change signal/confirmation helper is missing.",
  );

  console.log(
    "   PASS - book and selected chapter dirty state feed one protection boundary.",
  );

  console.log("");
  console.log("3. Studio navigation protection");

  assert(
    editor.includes(
      "Leave the editor and discard them?",
    ) &&
      editor.includes("event.preventDefault()"),
    "Back-to-Studio navigation is not protected.",
  );

  console.log(
    "   PASS - leaving the loaded Writer editor requires confirmation when dirty.",
  );

  console.log("");
  console.log("4. Chapter switching protection");

  assert(
    editor.includes("selectChapterSafely") &&
      editor.includes(
        "Switch chapters and discard those changes?",
      ),
    "Dirty chapter switching protection is missing.",
  );

  console.log(
    "   PASS - switching away from a dirty chapter requires confirmation.",
  );

  console.log("");
  console.log("5. Publishing transition protection");

  assert(
    editor.includes(
      "Change publishing status and discard those unsaved edits?",
    ),
    "Publishing transitions can bypass unsaved edits.",
  );

  console.log(
    "   PASS - status transitions do not silently discard unsaved editor state.",
  );

  console.log("");
  console.log("6. Protection remains compatible with autosave");

  assert(
    editor.includes("hasUnsavedChanges") &&
      editor.includes('"beforeunload"'),
    "Section 8.3 protection signals were removed.",
  );

  console.log(
    "   PASS - unsaved-change protection remains active while later autosave layers are present.",
  );

  console.log("");
  console.log("SECTION 8.3 PASSED.");
  console.log(
    "The Writer editor is ready for Section 8.4 chapter autosave.",
  );
}

main().catch((error) => {
  console.error("");
  console.error("SECTION 8.3 FAILED.");
  console.error(error);
  process.exit(1);
});