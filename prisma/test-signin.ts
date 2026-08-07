import "dotenv/config";
import { RoleKey } from "../src/generated/prisma/client";
import { hashPassword } from "../src/lib/password";
import { signinUser, SigninError } from "../src/lib/signin";
import { getPrismaClient } from "../src/lib/prisma";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

async function expectInvalidCredentials(
  action: () => Promise<unknown>,
  label: string,
) {
  let rejected = false;

  try {
    await action();
  } catch (error) {
    rejected =
      error instanceof SigninError &&
      error.status === 401 &&
      error.code === "INVALID_CREDENTIALS";
  }

  assert(rejected, `${label} did not return INVALID_CREDENTIALS.`);
}

async function main() {
  const prisma = getPrismaClient();
  assert(prisma, "Prisma client is unavailable.");

  const suffix = Date.now().toString(36);
  const email = `section-5-4-${suffix}@example.test`;
  const username = `signin-${suffix}`.slice(0, 32);
  const password = "SigninTest2026Password";

  console.log("");
  console.log("SECTION 5.4 database signin test");
  console.log("");

  const readerRole = await prisma.role.findUnique({
    where: { key: RoleKey.READER },
  });

  assert(readerRole, "READER role is missing.");

  const passwordHash = await hashPassword(password);

  try {
    await prisma.user.create({
      data: {
        email,
        passwordHash,
        name: "Section 5.4 Signin User",
        username,
        avatar: "S5",
        goals: ["reading"],
        activeRole: RoleKey.READER,
        roles: {
          create: {
            roleId: readerRole.id,
          },
        },
      },
    });

    console.log("1. Correct credentials");

    const result = await signinUser({
      email: email.toUpperCase(),
      password,
    });

    assert(result.profile.email === email, "Signin returned the wrong email.");
    assert(result.profile.username === username, "Signin returned the wrong username.");
    assert(result.profile.roles.reader === true, "Reader role missing from signin profile.");
    assert(result.profile.roles.writer === false, "Signin profile unexpectedly has Writer.");
    assert(result.profile.roles.admin === false, "Signin profile unexpectedly has Admin.");

    console.log("   PASS - correct credentials return the safe database profile.");

    console.log("");
    console.log("2. Wrong password");

    await expectInvalidCredentials(
      () =>
        signinUser({
          email,
          password: "DefinitelyWrong2026",
        }),
      "Wrong password",
    );

    console.log("   PASS - wrong password is rejected.");

    console.log("");
    console.log("3. Unknown email");

    await expectInvalidCredentials(
      () =>
        signinUser({
          email: `unknown-${suffix}@example.test`,
          password,
        }),
      "Unknown email",
    );

    console.log("   PASS - unknown email uses the same invalid-credentials response.");

    console.log("");
    console.log("4. Safe response");

    const serialized = JSON.stringify(result);
    assert(
      !serialized.includes("passwordHash"),
      "Signin result exposes passwordHash.",
    );
    assert(
      !serialized.includes(password),
      "Signin result exposes plain password.",
    );

    console.log("   PASS - signin result exposes no password data.");

    console.log("");
    console.log("SECTION 5.4 PASSED.");
  } finally {
    await prisma.user.deleteMany({
      where: {
        email,
      },
    });

    console.log("Temporary signin test user cleaned up.");
  }
}

main()
  .catch((error) => {
    console.error("");
    console.error("SECTION 5.4 FAILED.");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    const prisma = getPrismaClient();
    if (prisma) {
      await prisma.$disconnect();
    }
  });