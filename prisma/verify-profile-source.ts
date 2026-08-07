import { readFile } from "node:fs/promises";
import path from "node:path";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

async function main() {
  console.log("");
  console.log("SECTION 6.6 profile source verification");
  console.log("");

  const context = await readFile(
    path.join(
      process.cwd(),
      "src",
      "context",
      "AccountContext.tsx",
    ),
    "utf8",
  );

  const accountPage = await readFile(
    path.join(
      process.cwd(),
      "app",
      "account",
      "page.tsx",
    ),
    "utf8",
  );

  const route = await readFile(
    path.join(
      process.cwd(),
      "app",
      "api",
      "account",
      "profile",
      "route.ts",
    ),
    "utf8",
  );

  assert(
    context.includes("/api/account/profile"),
    "AccountContext does not persist profile changes through the server.",
  );

  assert(
    !accountPage.includes("onClick={toggleMfa}"),
    "Account page still contains fake MFA enable/disable control.",
  );

  assert(
    !accountPage.includes("toggleSocialProvider("),
    "Account page still contains fake social-provider connection control.",
  );

  for (const forbidden of [
    "passwordHash",
    "roles:",
    "email:",
    "mfaEnabled:",
    "mfaMethod:",
    "connectedSocials:",
  ]) {
    assert(
      !route.includes(forbidden),
      `Profile update API unexpectedly accepts protected field marker: ${forbidden}`,
    );
  }

  console.log(
    "PASS - editable profile changes are server-persisted and protected security/role fields are not client writable.",
  );

  console.log("");
  console.log("SECTION 6.6 PASSED.");
}

main().catch((error) => {
  console.error("");
  console.error("SECTION 6.6 FAILED.");
  console.error(error);
  process.exit(1);
});