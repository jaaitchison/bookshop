import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

async function collectSourceFiles(root: string): Promise<string[]> {
  const absolute = path.join(process.cwd(), root);
  const entries = await readdir(absolute, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(absolute, entry.name);

    if (entry.isDirectory()) {
      files.push(
        ...(await collectSourceFiles(
          path.relative(process.cwd(), fullPath),
        )),
      );
      continue;
    }

    if (
      entry.name.endsWith(".ts") ||
      entry.name.endsWith(".tsx")
    ) {
      files.push(fullPath);
    }
  }

  return files;
}

async function main() {
  console.log("");
  console.log("SECTION 5.12 authentication close-out verification");
  console.log("");

  const files = [
    ...(await collectSourceFiles("app")),
    ...(await collectSourceFiles("src")),
  ];

  const forbidden = [
    "maya@example.com",
    "Password: bookshop",
    "bookshop-auth-users",
    "bookshop-auth-session",
    "bookshop-account-profile",
    "bookshop_session",
    "toggleWriter(",
    "toggleAdmin(",
    "sync-session",
    "sync-profile",
  ];

  console.log("1. Prototype authentication markers");

  const violations: string[] = [];

  for (const file of files) {
    const source = await readFile(file, "utf8");

    for (const marker of forbidden) {
      if (source.includes(marker)) {
        violations.push(
          `${path.relative(process.cwd(), file)} contains ${marker}`,
        );
      }
    }
  }

  assert(
    violations.length === 0,
    `Prototype authentication remains:\n${violations.join("\n")}`,
  );

  console.log("   PASS - no prototype authentication markers remain.");

  console.log("");
  console.log("2. Required V2 authentication routes");

  const required = [
    "app/api/auth/signup/route.ts",
    "app/api/auth/signin/route.ts",
    "app/api/auth/signout/route.ts",
    "app/api/auth/me/route.ts",
    "app/api/auth/authorize/route.ts",
    "app/api/auth/roles/route.ts",
  ];

  for (const relative of required) {
    const source = await readFile(
      path.join(process.cwd(), relative),
      "utf8",
    );
    assert(source.length > 0, `Missing ${relative}`);
  }

  console.log("   PASS - all V2 auth routes exist.");

  console.log("");
  console.log("3. V2 cookie and database session");

  const databaseSession = await readFile(
    path.join(
      process.cwd(),
      "src",
      "lib",
      "database-session.ts",
    ),
    "utf8",
  );

  assert(
    databaseSession.includes('bookshop_auth_v2'),
    "V2 cookie name is missing.",
  );
  assert(
    databaseSession.includes("tokenHash"),
    "Database token hashing is missing.",
  );
  assert(
    databaseSession.includes("httpOnly: true"),
    "HTTP-only cookie configuration is missing.",
  );

  console.log("   PASS - database session security markers exist.");

  console.log("");
  console.log("4. Documentation");

  const docs = await readFile(
    path.join(process.cwd(), "docs", "AUTHENTICATION.md"),
    "utf8",
  );

  assert(
    docs.includes("UserRoleAssignment"),
    "Authentication documentation is incomplete.",
  );
  assert(
    docs.includes("bookshop_auth_v2"),
    "Authentication cookie is undocumented.",
  );

  console.log("   PASS - authentication architecture is documented.");

  console.log("");
  console.log("SECTION 5.12 PASSED.");
}

main().catch((error) => {
  console.error("");
  console.error("SECTION 5.12 FAILED.");
  console.error(error);
  process.exit(1);
});