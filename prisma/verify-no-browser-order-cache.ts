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
  console.log("SECTION 6.7 browser order-cache removal verification");
  console.log("");

  const files = [
    ...(await collect("app")),
    ...(await collect("src")),
  ];

  const violations: string[] = [];

  for (const file of files) {
    const source = await readFile(file, "utf8");

    for (const marker of [
      "bookshop-account-orders-",
      "getOrdersStorageKey",
      "bookshop-account-updated",
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
    `Browser order-cache remnants found:\n${violations.join("\n")}`,
  );

  const context = await readFile(
    path.join(process.cwd(), "src", "context", "AccountContext.tsx"),
    "utf8",
  );

  assert(
    context.includes("refreshOrders"),
    "AccountContext has no server-backed refreshOrders function.",
  );
  assert(
    context.includes('fetch(ACCOUNT_API_URL'),
    "AccountContext does not read orders from /api/account.",
  );

  const success = await readFile(
    path.join(process.cwd(), "app", "checkout", "success", "page.tsx"),
    "utf8",
  );

  assert(success.includes("/api/checkout/status"), "Checkout success does not read PostgreSQL-backed payment state.");
  assert(
    !success.includes("localStorage"),
    "Checkout success still depends on localStorage.",
  );

  console.log(
    "PASS - browser order cache is gone and payment success uses PostgreSQL-backed status.",
  );
  console.log("");
  console.log("SECTION 6.7 PASSED.");
}

main().catch((error) => {
  console.error("");
  console.error("SECTION 6.7 FAILED.");
  console.error(error);
  process.exit(1);
});
