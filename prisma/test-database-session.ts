import "dotenv/config";
import { RoleKey } from "../src/generated/prisma/client";
import {
  createDatabaseSession,
  resolveDatabaseSession,
  revokeDatabaseSession,
} from "../src/lib/database-session";
import { hashPassword } from "../src/lib/password";
import { hashSessionToken } from "../src/lib/session-token";
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
  const email = `section-5-5-${suffix}@example.test`;
  const username = `session-${suffix}`.slice(0, 32);

  const readerRole = await prisma.role.findUnique({
    where: {
      key: RoleKey.READER,
    },
  });

  assert(readerRole, "READER role is missing.");

  console.log("");
  console.log("SECTION 5.5 database session test");
  console.log("");

  const user = await prisma.user.create({
    data: {
      email,
      username,
      name: "Section 5.5 Session User",
      passwordHash: await hashPassword("SessionTest2026Password"),
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

  try {
    console.log("1. Create session");

    const created = await createDatabaseSession(user.id);
    assert(created.token.length >= 40, "Raw session token is unexpectedly short.");

    const stored = await prisma.authSession.findUnique({
      where: {
        tokenHash: hashSessionToken(created.token),
      },
    });

    assert(stored, "AuthSession record was not created.");
    assert(stored.tokenHash !== created.token, "Raw session token was stored in database.");
    assert(stored.expiresAt > new Date(), "Session expiry is not in the future.");

    console.log("   PASS - raw token is returned while only its hash is stored.");

    console.log("");
    console.log("2. Resolve current user");

    const resolved = await resolveDatabaseSession(created.token);

    assert(resolved, "Valid database session did not resolve.");
    assert(resolved.userId === user.id, "Resolved session has wrong user.");
    assert(resolved.profile.email === email, "Resolved profile has wrong email.");
    assert(resolved.profile.roles.reader === true, "Resolved Reader role missing.");
    assert(resolved.profile.roles.writer === false, "Resolved profile unexpectedly has Writer.");
    assert(resolved.profile.roles.admin === false, "Resolved profile unexpectedly has Admin.");

    console.log("   PASS - session resolves the live database user and roles.");

    console.log("");
    console.log("3. Invalid token");

    const invalid = await resolveDatabaseSession("not-a-real-session-token");
    assert(invalid === null, "Invalid token unexpectedly resolved.");

    console.log("   PASS - invalid token is rejected.");

    console.log("");
    console.log("4. Expired session");

    await prisma.authSession.update({
      where: {
        id: stored.id,
      },
      data: {
        expiresAt: new Date(Date.now() - 60_000),
      },
    });

    const expired = await resolveDatabaseSession(created.token);
    assert(expired === null, "Expired session unexpectedly resolved.");

    const expiredRecord = await prisma.authSession.findUnique({
      where: {
        id: stored.id,
      },
    });

    assert(!expiredRecord, "Expired session record was not cleaned up.");

    console.log("   PASS - expired sessions are rejected and removed.");

    console.log("");
    console.log("5. Logout/revoke");

    const secondSession = await createDatabaseSession(user.id);
    const revoked = await revokeDatabaseSession(secondSession.token);

    assert(revoked, "Valid session was not revoked.");

    const afterLogout = await resolveDatabaseSession(secondSession.token);
    assert(afterLogout === null, "Revoked session still resolves.");

    console.log("   PASS - logout revokes the database session.");

    console.log("");
    console.log("SECTION 5.5 PASSED.");
  } finally {
    await prisma.authSession.deleteMany({
      where: {
        userId: user.id,
      },
    });

    await prisma.user.delete({
      where: {
        id: user.id,
      },
    }).catch(() => undefined);

    console.log("Temporary session test records cleaned up.");
  }
}

main()
  .catch((error) => {
    console.error("");
    console.error("SECTION 5.5 FAILED.");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    const prisma = getPrismaClient();
    if (prisma) {
      await prisma.$disconnect();
    }
  });