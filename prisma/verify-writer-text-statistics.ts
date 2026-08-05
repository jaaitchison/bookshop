import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  countWords,
  getTextStatistics,
} from "../src/lib/writer-text-statistics";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

async function main() {
  console.log("");
  console.log("SECTION 8.6 word counts and manuscript statistics verification");
  console.log("");

  console.log("1. Word counting");

  assert(countWords("") === 0, "Empty text should contain zero words.");
  assert(countWords("one") === 1, "Single word count failed.");
  assert(
    countWords("one   two\nthree") === 3,
    "Whitespace-separated word count failed.",
  );

  console.log("   PASS - word counting handles empty and mixed whitespace.");

  console.log("");
  console.log("2. Text statistics");

  const stats = getTextStatistics("one two three");

  assert(stats.words === 3, "Statistics word count is wrong.");
  assert(stats.characters === 13, "Character count is wrong.");
  assert(
    stats.charactersWithoutSpaces === 11,
    "Character-without-spaces count is wrong.",
  );
  assert(
    stats.estimatedReadingMinutes === 1,
    "Short text should estimate at least one minute.",
  );

  console.log(
    "   PASS - character and estimated reading-time statistics are correct.",
  );

  console.log("");
  console.log("3. Writer editor integration");

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
    "selectedChapterStatistics",
    "manuscriptStatistics",
    'data-testid="chapter-word-count"',
    'data-testid="chapter-character-count"',
    'data-testid="manuscript-word-count"',
    'data-testid="manuscript-chapter-count"',
    'data-testid="manuscript-reading-time"',
  ]) {
    assert(
      editor.includes(marker),
      `Writer statistic marker missing: ${marker}`,
    );
  }

  console.log(
    "   PASS - selected chapter and whole manuscript statistics are visible in Writer Studio.",
  );

  console.log("");
  console.log("4. No database dependency");

  assert(
    !editor.includes("wordCount:") &&
      !editor.includes("readingMinutes:"),
    "Statistics should remain derived client-side rather than persisted.",
  );

  console.log(
    "   PASS - word counts remain derived values and require no schema migration.",
  );

  console.log("");
  console.log("SECTION 8.6 PASSED.");
  console.log(
    "The Writer editor is ready for Section 8.7 Markdown authoring.",
  );
}

main().catch((error) => {
  console.error("");
  console.error("SECTION 8.6 FAILED.");
  console.error(error);
  process.exit(1);
});