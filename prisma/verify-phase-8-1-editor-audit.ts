import { readFile } from "node:fs/promises";
import path from "node:path";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

async function main() {
  console.log("");
  console.log("SECTION 8.1 Writer editor audit verification");
  console.log("");

  const audit = await readFile(
    path.join(
      process.cwd(),
      "docs",
      "SECTION-8-1-WRITER-EDITOR-AUDIT.md",
    ),
    "utf8",
  );

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

  const schema = await readFile(
    path.join(process.cwd(), "prisma", "schema.prisma"),
    "utf8",
  );

  console.log("1. Existing manual-save workflow");

  assert(
    editor.includes("Save book details") &&
      editor.includes("Save chapter"),
    "Audit baseline does not match the current manual-save editor.",
  );

  console.log(
    "   PASS - current editor still exposes explicit book/chapter saves.",
  );

  console.log("");
  console.log("2. Phase 8 gaps recorded");

  for (const marker of [
    "Autosave",
    "Unsaved-change protection",
    "Markdown authoring",
    "Cover upload",
    "Revision history",
    "Concurrency protection",
    "Word counts",
  ]) {
    assert(
      audit.includes(marker),
      `Phase 8 audit topic missing: ${marker}`,
    );
  }

  console.log(
    "   PASS - major Writer authoring gaps are recorded.",
  );

  console.log("");
  console.log("3. Revision schema reality");

  assert(
    !schema.includes("model ChapterRevision"),
    "ChapterRevision already exists; Section 8.1 audit must be updated.",
  );

  assert(
    audit.includes("schema migration"),
    "Audit does not record the revision-history schema requirement.",
  );

  console.log(
    "   PASS - revision-history database work is correctly identified as future work.",
  );

  console.log("");
  console.log("4. Implementation order");

  for (const section of [
    "Section 8.2",
    "Section 8.3",
    "Section 8.4",
    "Section 8.5",
    "Section 8.6",
    "Section 8.7",
    "Section 8.8",
    "Section 8.9",
    "Section 8.10",
    "Section 8.11",
    "Section 8.12",
  ]) {
    assert(
      audit.includes(section),
      `Phase 8 roadmap section missing: ${section}`,
    );
  }

  console.log(
    "   PASS - Phase 8 implementation sequence is documented.",
  );

  console.log("");
  console.log("SECTION 8.1 PASSED.");
  console.log(
    "The project is ready for Section 8.2 dirty-state and save-status foundation.",
  );
}

main().catch((error) => {
  console.error("");
  console.error("SECTION 8.1 FAILED.");
  console.error(error);
  process.exit(1);
});