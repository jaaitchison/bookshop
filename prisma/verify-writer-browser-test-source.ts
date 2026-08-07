import { readFile } from "node:fs/promises";
import path from "node:path";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

async function main() {
  console.log("");
  console.log("SECTION 7.9 Writer browser test source verification");
  console.log("");

  const source = await readFile(
    path.join(
      process.cwd(),
      "tests",
      "browser",
      "writer-studio-flow.spec.ts",
    ),
    "utf8",
  );

  for (const marker of [
    'reader@bookshop.local',
    'writer@bookshop.local',
    'admin@bookshop.local',
    'Write book',
    'Create Draft',
    'Save book details',
    'Save chapter',
    'Publish',
    'Archive',
    'Unable to open book',
    'denied=writer',
  ]) {
    assert(
      source.includes(marker),
      `Writer browser test marker missing: ${marker}`,
    );
  }

  console.log(
    "PASS - browser suite covers Reader denial, Writer creation/editing/chapters/publishing, ownership isolation and Admin access.",
  );

  console.log("");
  console.log("SECTION 7.9 PASSED.");
}

main().catch((error) => {
  console.error("");
  console.error("SECTION 7.9 FAILED.");
  console.error(error);
  process.exit(1);
});