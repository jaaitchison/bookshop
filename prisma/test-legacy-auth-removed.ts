import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

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

  const accountStoreSource = await readFile(
    path.join(process.cwd(), "src", "lib", "account-store.ts"),
    "utf8",
  );

  for (const token of [
    "password:",
    "StoredAccountUser",
    "profiles:",
    "sessions:",
  ]) {
    if (accountStoreSource.includes(token)) {
      throw new Error(
        `account-store.ts still contains auth/profile data: ${token}`,
      );
    }
  }

  const jsonStore = JSON.parse(
    await readFile(
      path.join(process.cwd(), "data", "account-store.json"),
      "utf8",
    ),
  ) as Record<string, unknown>;

  for (const key of ["users", "profiles", "sessions"]) {
    if (key in jsonStore) {
      throw new Error(
        `data/account-store.json still contains legacy ${key}.`,
      );
    }
  }

  if (!("ordersByProfile" in jsonStore)) {
    throw new Error("Order compatibility data was removed unexpectedly.");
  }

  if (!("stripeProcessedEvents" in jsonStore)) {
    throw new Error(
      "Stripe event compatibility data was removed unexpectedly.",
    );
  }

  console.log("PASS - legacy encoded-cookie authentication is removed.");
  console.log("PASS - JSON users/passwords/profiles/sessions are removed.");
  console.log("PASS - order and Stripe-event compatibility data remains.");
  console.log("");
  console.log("SECTION 5.10 PASSED.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});