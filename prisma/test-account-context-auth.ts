import { readFile } from "node:fs/promises";
import path from "node:path";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

async function main() {
  const contextPath = path.join(
    process.cwd(),
    "src",
    "context",
    "AccountContext.tsx",
  );

  const source = await readFile(contextPath, "utf8");

  console.log("");
  console.log("SECTION 5.7 AccountContext authentication test");
  console.log("");

  console.log("1. New auth endpoints");

  for (const endpoint of [
    "/api/auth/me",
    "/api/auth/signin",
    "/api/auth/signup",
    "/api/auth/signout",
  ]) {
    assert(source.includes(endpoint), `Missing ${endpoint} integration.`);
  }

  console.log("   PASS - AccountContext uses all four database auth endpoints.");

  console.log("");
  console.log("2. Authentication localStorage removed");

  for (const forbidden of [
    "bookshop-auth-users",
    "bookshop-auth-session",
    "bookshop-account-profile",
    "StoredAccountUser",
    "readStoredUsers",
    "writeStoredUsers",
  ]) {
    assert(
      !source.includes(forbidden),
      `Legacy authentication storage remains: ${forbidden}`,
    );
  }

  console.log("   PASS - users, passwords and auth sessions are no longer stored locally.");

  console.log("");
  console.log("3. No legacy session sync");

  assert(
    !source.includes("sync-session"),
    "AccountContext still calls legacy sync-session.",
  );

  assert(
    !source.includes("sync-profile"),
    "AccountContext still calls legacy sync-profile.",
  );

  console.log("   PASS - legacy account session/profile sync removed.");

  console.log("");
  console.log("4. Credentials included for HTTP-only cookie");

  assert(
    source.includes('credentials: "include"'),
    "Authenticated fetches do not include cookies.",
  );

  console.log("   PASS - database session cookie participates in auth requests.");

  console.log("");
  console.log("5. Order cache scope");

  assert(
    source.includes("bookshop-account-orders-"),
    "Order cache was unexpectedly removed.",
  );

  console.log("   PASS - only non-authentication order caching remains in localStorage.");

  console.log("");
  console.log("");
  console.log("6. Checkout success no longer restores auth from localStorage");

  const checkoutSuccessPath = path.join(
    process.cwd(),
    "app",
    "checkout",
    "success",
    "page.tsx",
  );
  const checkoutSource = await readFile(checkoutSuccessPath, "utf8");

  assert(
    !checkoutSource.includes("PROFILE_STORAGE_KEY"),
    "Checkout success still imports the old profile auth storage key.",
  );
  assert(
    !checkoutSource.includes("SESSION_STORAGE_KEY"),
    "Checkout success still imports the old session auth storage key.",
  );
  assert(
    checkoutSource.includes("getOrdersStorageKey"),
    "Checkout success unexpectedly lost the harmless order cache.",
  );

  console.log("   PASS - checkout success keeps order cache only, not auth state.");

  console.log("");
  console.log("SECTION 5.7 PASSED.");
}

main().catch((error) => {
  console.error("");
  console.error("SECTION 5.7 FAILED.");
  console.error(error);
  process.exit(1);
});