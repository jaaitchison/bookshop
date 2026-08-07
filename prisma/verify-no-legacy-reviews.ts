import { access, readFile, readdir } from "node:fs/promises";
import path from "node:path";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

async function exists(relative: string) {
  try {
    await access(path.join(process.cwd(), relative));
    return true;
  } catch {
    return false;
  }
}

async function collect(relativeRoot: string): Promise<string[]> {
  const root = path.join(process.cwd(), relativeRoot);
  const entries = await readdir(root, {
    withFileTypes: true,
  });

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
  console.log("SECTION 6.8 legacy review removal verification");
  console.log("");

  assert(
    !(await exists("src/lib/reviews-store.ts")),
    "src/lib/reviews-store.ts still exists.",
  );

  assert(
    !(await exists("data/reviews.json")),
    "data/reviews.json still exists.",
  );

  const files = [
    ...(await collect("app")),
    ...(await collect("src")),
  ];

  const violations: string[] = [];

  for (const file of files) {
    const source = await readFile(file, "utf8");

    for (const marker of [
      "reviews-store",
      "data/reviews.json",
      "addBookReview(",
      "getBookReviews(",
    ]) {
      if (source.includes(marker)) {
        violations.push(
          `${path.relative(process.cwd(), file)} contains ${marker}`,
        );
      }
    }
  }

  assert(
    violations.length === 0,
    `Legacy review runtime code remains:\n${violations.join("\n")}`,
  );

  console.log(
    "PASS - runtime review storage is PostgreSQL-only.",
  );

  if (await exists("data/archive/legacy-unmapped-reviews.json")) {
    console.log(
      "PASS - legacy unmapped reviews were preserved as archive-only data.",
    );
  } else {
    console.log(
      "INFO - no legacy review archive was required.",
    );
  }

  console.log("");
  console.log("SECTION 6.8 PASSED.");
}

main().catch((error) => {
  console.error("");
  console.error("SECTION 6.8 FAILED.");
  console.error(error);
  process.exit(1);
});