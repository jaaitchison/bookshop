import { readFile } from "node:fs/promises";
import path from "node:path";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

async function main() {
  const source = await readFile(
    path.join(process.cwd(), "proxy.ts"),
    "utf8",
  );

  console.log("");
  console.log("SECTION 5.8 proxy source regression test");
  console.log("");

  for (const forbidden of [
    "AUTH_SESSION_COOKIE",
    "decodeAuthSession",
    "hasSessionRole",
    "@/src/lib/auth-session",
  ]) {
    assert(
      !source.includes(forbidden),
      `Legacy proxy authentication remains: ${forbidden}`,
    );
  }

  assert(
    source.includes("DATABASE_AUTH_COOKIE"),
    "Proxy does not use the V2 database auth cookie.",
  );

  assert(
    source.includes("/api/auth/authorize"),
    "Proxy does not call the database authorization endpoint.",
  );

  console.log("PASS - proxy uses only V2 database-backed authorization.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});