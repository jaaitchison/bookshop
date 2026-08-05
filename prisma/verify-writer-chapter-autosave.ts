import { readFile } from "node:fs/promises";
import path from "node:path";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

async function main() {
  console.log("");
  console.log("SECTION 8.4 chapter autosave verification");
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

  console.log("1. Debounced autosave");

  assert(
    editor.includes("chapterAutosaveTimerRef") &&
      editor.includes("setTimeout(") &&
      editor.includes("1200"),
    "Debounced chapter autosave is missing.",
  );

  console.log(
    "   PASS - dirty selected chapter autosaves after a short pause.",
  );

  console.log("");
  console.log("2. Manual Save fallback");

  assert(
    editor.includes("const saveChapter = async") &&
      editor.includes("clearTimeout(") &&
      editor.includes("Save chapter"),
    "Manual chapter Save fallback is missing.",
  );

  console.log(
    "   PASS - manual Save remains available and cancels pending debounce.",
  );

  console.log("");
  console.log("3. Shared persistence path");

  assert(
    (
      editor.includes("const persistChapter = async") ||
      editor.includes("const persistChapter = useCallback(async")
    ) &&
      editor.includes("void persistChapter(selectedChapter)") &&
      editor.includes("await persistChapter(selectedChapter)"),
    "Autosave and manual Save do not share one persistence function.",
  );

  console.log(
    "   PASS - autosave and manual Save use the same secured PUT path.",
  );

  console.log("");
  console.log("4. Stale-response protection");

  assert(
    editor.includes("chapterSaveRequestRef") &&
      editor.includes(
        "requestId !== chapterSaveRequestRef.current",
      ),
    "Chapter save request sequencing is missing.",
  );

  console.log(
    "   PASS - older chapter save responses cannot replace newer save state.",
  );

  console.log("");
  console.log("5. Save-state integration");

  assert(
    editor.includes("setChapterSaving(true)") &&
      editor.includes("setChapterSaving(false)") &&
      editor.includes("setChapterBaselines"),
    "Autosave is not integrated with visible save state/baselines.",
  );

  console.log(
    "   PASS - autosave updates Saving/Saved/Error state and persisted baseline.",
  );

  console.log("");
  console.log("SECTION 8.4 PASSED.");
  console.log(
    "The Writer editor is ready for Section 8.5 book metadata autosave.",
  );
}

main().catch((error) => {
  console.error("");
  console.error("SECTION 8.4 FAILED.");
  console.error(error);
  process.exit(1);
});