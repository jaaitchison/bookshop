import "dotenv/config";
import { RoleKey } from "../src/generated/prisma/client";
import { signupUser, SignupError } from "../src/lib/signup";
import { verifyPassword } from "../src/lib/password";
import { getPrismaClient } from "../src/lib/prisma";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

async function main() {
  const prisma = getPrismaClient();
  assert(prisma, "Prisma client is unavailable.");

  const suffix = Date.now().toString(36);
  const email = `section-5-3-${suffix}@example.test`;
  const username = `section-5-3-${suffix}`.slice(0, 32);
  const password = "SignupTest2026Password";

  console.log("");
  console.log("SECTION 5.3 database signup test");
  console.log("");

  try {
    console.log("1. Create database-backed user");

    const result = await signupUser({
      name: "Section 5.3 Test User",
      email,
      username,
      password,
    });

    assert(result.profile.email === email, "Safe profile returned wrong email.");
    assert(result.profile.username === username, "Safe profile returned wrong username.");
    assert(result.profile.roles.reader === true, "New user is missing Reader role.");
    assert(result.profile.roles.writer === false, "New user unexpectedly has Writer role.");
    assert(result.profile.roles.admin === false, "New user unexpectedly has Admin role.");

    console.log("   PASS - signup returned a safe Reader profile.");

    console.log("");
    console.log("2. Verify PostgreSQL user and password hash");

    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

    assert(user, "New user was not written to PostgreSQL.");
    assert(user.passwordHash !== password, "Plain-text password was stored.");
    assert(
      await verifyPassword(password, user.passwordHash),
      "Stored password hash does not verify.",
    );

    const roleKeys = user.roles.map((assignment) => assignment.role.key);
    assert(roleKeys.includes(RoleKey.READER), "Reader assignment missing in database.");
    assert(!roleKeys.includes(RoleKey.WRITER), "Writer role should not be assigned.");
    assert(!roleKeys.includes(RoleKey.ADMIN), "Admin role should not be assigned.");

    console.log("   PASS - password is hashed and only READER is assigned.");

    console.log("");
    console.log("3. Verify duplicate email protection");

    let duplicateRejected = false;

    try {
      await signupUser({
        name: "Duplicate Test User",
        email,
        username: `other-${suffix}`.slice(0, 32),
        password,
      });
    } catch (error) {
      duplicateRejected =
        error instanceof SignupError &&
        error.status === 409 &&
        error.code === "EMAIL_EXISTS";
    }

    assert(duplicateRejected, "Duplicate email was not rejected correctly.");
    console.log("   PASS - duplicate email returns a conflict.");

    console.log("");
    console.log("4. Verify duplicate username protection");

    let usernameRejected = false;

    try {
      await signupUser({
        name: "Duplicate Username User",
        email: `other-${suffix}@example.test`,
        username,
        password,
      });
    } catch (error) {
      usernameRejected =
        error instanceof SignupError &&
        error.status === 409 &&
        error.code === "USERNAME_EXISTS";
    }

    assert(usernameRejected, "Duplicate username was not rejected correctly.");
    console.log("   PASS - duplicate username returns a conflict.");

    console.log("");
    console.log("SECTION 5.3 PASSED.");
  } finally {
    await prisma.user.deleteMany({
      where: {
        OR: [
          { email },
          { email: `other-${suffix}@example.test` },
        ],
      },
    });

    console.log("Temporary signup test users cleaned up.");
  }
}

main()
  .catch((error) => {
    console.error("");
    console.error("SECTION 5.3 FAILED.");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    const prisma = getPrismaClient();
    if (prisma) {
      await prisma.$disconnect();
    }
  });