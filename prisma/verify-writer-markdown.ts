import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  applyMarkdownLinePrefix,
  applyMarkdownWrap,
  parseMarkdownBlocks,
  stripInlineMarkdown,
} from "../src/lib/writer-markdown";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

async function main() {
  console.log("");
  console.log("SECTION 8.7 Markdown authoring verification");
  console.log("");

  console.log("1. Inline formatting helper");

  const bold = applyMarkdownWrap(
    "hello world",
    6,
    11,
    "**",
  );

  assert(
    bold.value === "hello **world**",
    "Bold Markdown wrapping failed.",
  );

  console.log(
    "   PASS - inline Markdown wrapping preserves source text.",
  );

  console.log("");
  console.log("2. Line formatting helper");

  const bullet = applyMarkdownLinePrefix(
    "one\ntwo",
    0,
    7,
    "- ",
  );

  assert(
    bullet.value === "- one\n- two",
    "Multi-line Markdown prefixing failed.",
  );

  console.log(
    "   PASS - headings/lists/quotes can prefix selected lines.",
  );

  console.log("");
  console.log("3. Safe preview parser");

  const blocks = parseMarkdownBlocks(
    "# Heading\n- Item\n> Quote\nParagraph",
  );

  assert(
    blocks.length === 4 &&
      blocks[0].type === "heading" &&
      blocks[1].type === "bullet" &&
      blocks[2].type === "quote" &&
      blocks[3].type === "paragraph",
    "Markdown preview block parsing failed.",
  );

  assert(
    stripInlineMarkdown("**bold** and *italic*") ===
      "bold and italic",
    "Inline Markdown stripping failed.",
  );

  console.log(
    "   PASS - preview uses structured text parsing rather than injected HTML.",
  );

  console.log("");
  console.log("4. Writer editor integration");

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
    'data-testid="markdown-toolbar"',
    'data-testid="markdown-preview"',
    'ref={chapterContentRef}',
    'applyInlineMarkdown("**")',
    'applyInlineMarkdown("*")',
    'applyLineMarkdown("# ")',
    'applyLineMarkdown("- ")',
    'applyLineMarkdown("> ")',
    "Show preview",
    "Hide preview",
  ]) {
    assert(
      editor.includes(marker),
      `Markdown editor marker missing: ${marker}`,
    );
  }

  console.log(
    "   PASS - Writer chapter editor exposes Markdown tools and live preview.",
  );

  console.log("");
  console.log("5. Source remains Chapter.content");

  assert(
    editor.includes("selectedChapter.content") &&
      !editor.includes("dangerouslySetInnerHTML"),
    "Markdown must remain plain chapter source and preview must not inject raw HTML.",
  );

  console.log(
    "   PASS - Markdown remains plain source text with no raw HTML injection.",
  );

  console.log("");
  console.log("SECTION 8.7 PASSED.");
  console.log(
    "The Writer editor is ready for Section 8.8 cover upload foundation.",
  );
}

main().catch((error) => {
  console.error("");
  console.error("SECTION 8.7 FAILED.");
  console.error(error);
  process.exit(1);
});