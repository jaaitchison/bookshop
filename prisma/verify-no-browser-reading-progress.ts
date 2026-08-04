import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

async function collect(relativeRoot: string): Promise<string[]> {
  const root = path.join(process.cwd(), relativeRoot);
  const entries = await readdir(root, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const absolute = path.join(root, entry.name);
    const relative = path.relative(process.cwd(), absolute);

    if (entry.isDirectory()) {
      files.push(...(await collect(relative)));
    } else if (
      entry.name.endsWith(".ts") ||
      entry.name.endsWith(".tsx")
    ) {
      files.push(absolute);
    }
  }

  return files;
}

async function main() {
  console.log("");
  console.log("SECTION 6.9 browser reading-progress removal verification");
  console.log("");

  const files = [
    ...(await collect("app")),
    ...(await collect("src")),
  ];

  const violations: string[] = [];

  for (const file of files) {
    const source = await readFile(file, "utf8");

    if (source.includes("bookshop-reading-progress-")) {
      violations.push(
        `${path.relative(process.cwd(), file)} contains browser reading-progress storage`,
      );
    }
  }

  assert(
    violations.length === 0,
    `Browser reading-progress remnants found:\n${violations.join("\n")}`,
  );

  const library = await readFile(
    path.join(process.cwd(), "app", "library", "page.tsx"),
    "utf8",
  );

  assert(
    library.includes("/api/reading-progress"),
    "Library does not read PostgreSQL-backed progress.",
  );

  console.log(
    "PASS - reading progress no longer uses browser localStorage.",
  );
  console.log("");
  console.log("SECTION 6.9 PASSED.");
}

main().catch((error) => {
  console.error("");
  console.error("SECTION 6.9 FAILED.");
  console.error(error);
  process.exit(1);
});