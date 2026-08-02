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

async function collectSourceFiles(relativeRoot: string): Promise<string[]> {
  const absoluteRoot = path.join(process.cwd(), relativeRoot);
  const entries = await readdir(absoluteRoot, {
    withFileTypes: true,
  });

  const files: string[] = [];

  for (const entry of entries) {
    const absolute = path.join(absoluteRoot, entry.name);
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
  console.log("SECTION 6.4 JSON order-layer removal verification");
  console.log("");

  assert(
    !(await exists("data/account-store.json")),
    "data/account-store.json still exists.",
  );

  assert(
    !(await exists("src/lib/account-store.ts")),
    "src/lib/account-store.ts still exists.",
  );

  const files = [
    ...(await collectSourceFiles("app")),
    ...(await collectSourceFiles("src")),
  ];

  const violations: string[] = [];

  for (const file of files) {
    const source = await readFile(file, "utf8");

    for (const marker of [
      "account-store",
      "getAccountOrders",
      "saveAccountOrder",
      "getAccountOrderById",
      "ordersByProfile",
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
    `Runtime JSON order compatibility remains:\n${violations.join("\n")}`,
  );

  console.log(
    "PASS - no active application source depends on the JSON order store.",
  );

  if (await exists("data/archive/legacy-unmapped-orders.json")) {
    console.log(
      "PASS - unmapped legacy orders were preserved as archive-only data.",
    );
  } else {
    console.log(
      "INFO - no archive was required because no legacy unmapped orders were present.",
    );
  }

  console.log("");
  console.log("SECTION 6.4 PASSED.");
}

main().catch((error) => {
  console.error("");
  console.error("SECTION 6.4 FAILED.");
  console.error(error);
  process.exit(1);
});