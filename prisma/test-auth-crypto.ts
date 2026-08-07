import {
  hashPassword,
  MIN_PASSWORD_LENGTH,
  validatePassword,
  verifyPassword,
} from "../src/lib/password";
import {
  createSessionExpiry,
  createSessionToken,
  hashSessionToken,
} from "../src/lib/session-token";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

async function main() {
  console.log("");
  console.log("SECTION 5.2 authentication crypto test");

  const testPassword = "Bookshop2026TestPassword";

  console.log("");
  console.log("1. Password validation");
  assert(
    validatePassword(testPassword).valid,
    "A valid test password was rejected.",
  );
  assert(
    !validatePassword("short1").valid,
    "A password below the minimum length was accepted.",
  );
  console.log(`   PASS - minimum length is ${MIN_PASSWORD_LENGTH} characters.`);

  console.log("");
  console.log("2. Password hashing");
  const firstHash = await hashPassword(testPassword);
  const secondHash = await hashPassword(testPassword);

  assert(firstHash !== testPassword, "Password was not hashed.");
  assert(firstHash !== secondHash, "Independent password hashes should use different salts.");
  console.log("   PASS - password hashes are salted and do not expose the password.");

  console.log("");
  console.log("3. Password verification");
  assert(
    await verifyPassword(testPassword, firstHash),
    "Correct password failed verification.",
  );
  assert(
    !(await verifyPassword("WrongPassword123", firstHash)),
    "Incorrect password passed verification.",
  );
  console.log("   PASS - correct password verifies and incorrect password fails.");

  console.log("");
  console.log("4. Session tokens");
  const tokenOne = createSessionToken();
  const tokenTwo = createSessionToken();

  assert(tokenOne !== tokenTwo, "Session tokens should be unique.");
  assert(tokenOne.length >= 40, "Session token is unexpectedly short.");

  const tokenHash = hashSessionToken(tokenOne);
  assert(tokenHash !== tokenOne, "Raw session token must not equal stored hash.");
  assert(tokenHash.length === 64, "SHA-256 session hash should be 64 hex characters.");
  console.log("   PASS - cryptographically random tokens and SHA-256 storage hashes work.");

  console.log("");
  console.log("5. Session expiry");
  const now = new Date();
  const expiresAt = createSessionExpiry(now);

  assert(expiresAt.getTime() > now.getTime(), "Session expiry is not in the future.");
  console.log(`   PASS - session expiry created at ${expiresAt.toISOString()}.`);

  console.log("");
  console.log("SECTION 5.2 PASSED.");
}

main().catch((error) => {
  console.error("");
  console.error("SECTION 5.2 FAILED.");
  console.error(error);
  process.exit(1);
});