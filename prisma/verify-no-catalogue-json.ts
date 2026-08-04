import { access, readFile, readdir } from "node:fs/promises";
import path from "node:path";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

async function exists(relativePath: string) {
  try {
    await access(path.join(process.cwd(), relativePath));
    return true;
  } catch {
    return false;
  }
}

async function collectSourceFiles(
  relativeRoot: string,
): Promise<string[]> {
  const root = path.join(process.cwd(), relativeRoot);
  const entries = await readdir(root, {
    withFileTypes: true,
  });

  const files: string[] = [];

  for (const entry of entries) {
    const absolute = path.join(root, entry.name);
    const relative = path.relative(process.cwd(), absolute);

    if (entry.isDirectory()) {
      files.push(...(await collectSourceFiles(relative)));
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
  console.log("SECTION 7.8 catalogue fallback removal verification");
  console.log("");

  console.log("1. Active legacy JSON file");

  assert(
    !(await exists("data/catalog.json")),
    "data/catalog.json still exists as an active catalogue file.",
  );

  console.log(
    "   PASS - active catalogue JSON file has been removed.",
  );

  console.log("");
  console.log("2. Runtime source scan");

  const files = [
    ...(await collectSourceFiles("app")),
    ...(await collectSourceFiles("src")),
  ];

  const forbiddenMarkers = [
    "data/catalog.json",
    "catalog.json",
    "readCatalogFile",
    "writeCatalogFile",
    "mirrorBookToJson",
    "removeBookFromJson",
    "JSON fallback",
    "using JSON fallback",
  ];

  const violations: string[] = [];

  for (const file of files) {
    const source = await readFile(file, "utf8");

    for (const marker of forbiddenMarkers) {
      if (source.includes(marker)) {
        violations.push(
          `${path.relative(process.cwd(), file)} contains ${marker}`,
        );
      }
    }
  }

  assert(
    violations.length === 0,
    `Catalogue JSON runtime remnants found:\n${violations.join("\n")}`,
  );

  console.log(
    "   PASS - application runtime contains no catalogue JSON fallback/mirroring.",
  );

  console.log("");
  console.log("3. PostgreSQL requirement");

  const catalogue = await readFile(
    path.join(
      process.cwd(),
      "src",
      "lib",
      "catalog-data.ts",
    ),
    "utf8",
  );

  assert(
    catalogue.includes(
      "PostgreSQL is required for catalogue operations.",
    ),
    "Catalogue repository does not explicitly require PostgreSQL.",
  );

  assert(
    catalogue.includes("prisma.book.findMany") &&
      catalogue.includes("prisma.book.findFirst"),
    "Catalogue reads are not database-backed.",
  );

  console.log(
    "   PASS - PostgreSQL is the sole catalogue runtime authority.",
  );

  console.log("");
  console.log("SECTION 7.8 PASSED.");
}

main().catch((error) => {
  console.error("");
  console.error("SECTION 7.8 FAILED.");
  console.error(error);
  process.exit(1);
});