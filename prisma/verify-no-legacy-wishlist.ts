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
  const absoluteRoot = path.join(process.cwd(), relativeRoot);
  const entries = await readdir(absoluteRoot, {
    withFileTypes: true,
  });

  const files: string[] = [];

  for (const entry of entries) {
    const absolute = path.join(absoluteRoot, entry.name);
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
  console.log("SECTION 6.5 legacy wishlist removal verification");
  console.log("");

  assert(
    !(await exists("src/lib/wishlist-store.ts")),
    "src/lib/wishlist-store.ts still exists.",
  );

  assert(
    !(await exists("data/wishlist.json")),
    "data/wishlist.json still exists.",
  );

  const files = [
    ...(await collect("app")),
    ...(await collect("src")),
  ];

  const violations: string[] = [];

  for (const file of files) {
    const source = await readFile(file, "utf8");

    for (const marker of [
      "wishlist-store",
      "data/wishlist.json",
      "getWishlistItems()",
      "toggleWishlistItem(",
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
    `Legacy wishlist runtime code remains:\n${violations.join("\n")}`,
  );

  console.log(
    "PASS - runtime wishlist storage is PostgreSQL-only.",
  );

  if (await exists("data/archive/legacy-shared-wishlist.json")) {
    console.log(
      "PASS - legacy shared wishlist was preserved as archive-only data.",
    );
  } else {
    console.log(
      "INFO - no legacy shared wishlist archive was required.",
    );
  }

  console.log("");
  console.log("SECTION 6.5 PASSED.");
}

main().catch((error) => {
  console.error("");
  console.error("SECTION 6.5 FAILED.");
  console.error(error);
  process.exit(1);
});