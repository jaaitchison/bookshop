import { access, readFile, readdir } from "node:fs/promises";
import path from "node:path";
function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

const ROOTS = ["app", "src", "proxy.ts"];

const forbidden = [
  "bookshop_session",
  "AUTH_SESSION_COOKIE",
  "buildAuthSession",
  "encodeAuthSession",
  "decodeAuthSession",
  "getAuthSessionFromCookieHeader",
  "saveAccountUsers",
  "getAccountUsers",
  "saveAccountSession",
  "clearAccountSession",
];

async function collectFiles(entry: string): Promise<string[]> {
  const absolute = path.join(process.cwd(), entry);

  if (entry.endsWith(".ts")) {
    return [absolute];
  }

  const entries = await readdir(absolute, {
    withFileTypes: true,
  });

  const files: string[] = [];

  for (const item of entries) {
    const next = path.join(absolute, item.name);

    if (item.isDirectory()) {
      const relative = path.relative(process.cwd(), next);
      files.push(...(await collectFiles(relative)));
    } else if (
      item.name.endsWith(".ts") ||
      item.name.endsWith(".tsx")
    ) {
      files.push(next);
    }
  }

  return files;
}

async function main() {
  console.log("");
  console.log("SECTION 5.10 legacy authentication removal test");
  console.log("");

  const files: string[] = [];

  for (const root of ROOTS) {
    files.push(...(await collectFiles(root)));
  }

  const violations: string[] = [];

  for (const file of files) {
    const source = await readFile(file, "utf8");

    for (const token of forbidden) {
      if (source.includes(token)) {
        violations.push(
          `${path.relative(process.cwd(), file)} contains ${token}`,
        );
      }
    }
  }

  if (violations.length > 0) {
    throw new Error(
      `Legacy authentication remains:\n${violations.join("\n")}`,
    );
  }
  let legacyAccountStoreExists = true;

  try {
    await access(
      path.join(
        process.cwd(),
        "src",
        "lib",
        "account-store.ts",
      ),
    );
  } catch {
    legacyAccountStoreExists = false;
  }

  assert(
    !legacyAccountStoreExists,
    "src/lib/account-store.ts still exists.",
  );

  let legacyJsonStoreExists = true;

  try {
    await access(
      path.join(
        process.cwd(),
        "data",
        "account-store.json",
      ),
    );
  } catch {
    legacyJsonStoreExists = false;
  }

  assert(
    !legacyJsonStoreExists,
    "data/account-store.json still exists.",
  );

  console.log(
    "PASS - legacy authentication/account JSON storage remains removed.",
  );console.log("");
  console.log("SECTION 5.10 PASSED.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});