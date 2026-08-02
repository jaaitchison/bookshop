import "dotenv/config";
import { GET as authorize } from "../app/api/auth/authorize/route";
import {
  createDatabaseSession,
  DATABASE_AUTH_COOKIE,
  revokeDatabaseSession,
} from "../src/lib/database-session";
import { signinUser } from "../src/lib/signin";
import { getPrismaClient } from "../src/lib/prisma";
import { hashSessionToken } from "../src/lib/session-token";

type Role = "reader" | "writer" | "admin";

const EXPECTATIONS: Array<{
  email: string;
  role: Role;
  allowed: Role[];
  denied: Role[];
}> = [
  {
    email: "reader@bookshop.local",
    role: "reader",
    allowed: ["reader"],
    denied: ["writer", "admin"],
  },
  {
    email: "writer@bookshop.local",
    role: "writer",
    allowed: ["reader", "writer"],
    denied: ["admin"],
  },
  {
    email: "admin@bookshop.local",
    role: "admin",
    allowed: ["reader", "writer", "admin"],
    denied: [],
  },
];

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

async function authorizeRole(token: string, role: Role) {
  return authorize(
    new Request(`http://localhost/api/auth/authorize?role=${role}`, {
      headers: {
        cookie: `${DATABASE_AUTH_COOKIE}=${token}`,
      },
    }),
  );
}

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Development auth-user tests must not run in production.");
  }

  const password = process.env.DEV_TEST_USER_PASSWORD;
  assert(password, "DEV_TEST_USER_PASSWORD is missing.");

  const prisma = getPrismaClient();
  assert(prisma, "Prisma client is unavailable.");

  console.log("");
  console.log("SECTION 5.9 development-role stack test");
  console.log("");

  for (const expectation of EXPECTATIONS) {
    console.log(`${expectation.role.toUpperCase()} - ${expectation.email}`);

    const signin = await signinUser({
      email: expectation.email,
      password,
    });

    assert(
      signin.profile.roles.reader === true,
      `${expectation.email} is missing Reader.`,
    );

    if (expectation.role === "reader") {
      assert(!signin.profile.roles.writer, "Reader unexpectedly has Writer.");
      assert(!signin.profile.roles.admin, "Reader unexpectedly has Admin.");
    }

    if (expectation.role === "writer") {
      assert(signin.profile.roles.writer, "Writer role missing.");
      assert(!signin.profile.roles.admin, "Writer unexpectedly has Admin.");
    }

    if (expectation.role === "admin") {
      assert(signin.profile.roles.writer, "Admin should satisfy Writer.");
      assert(signin.profile.roles.admin, "Admin role missing.");
    }

    const session = await createDatabaseSession(signin.profile.id);

    const storedSession = await prisma.authSession.findFirst({
      where: {
        userId: signin.profile.id,
      },
    });

    assert(storedSession, "Database AuthSession was not created.");
    assert(
      storedSession.tokenHash !== session.token,
      "Raw session token was stored in PostgreSQL.",
    );

    for (const role of expectation.allowed) {
      const response = await authorizeRole(session.token, role);
      assert(
        response.status === 200,
        `${expectation.email} should have ${role} access but received ${response.status}.`,
      );
    }

    for (const role of expectation.denied) {
      const response = await authorizeRole(session.token, role);
      assert(
        response.status === 403,
        `${expectation.email} should be denied ${role} but received ${response.status}.`,
      );
    }

    await revokeDatabaseSession(session.token);

    const remaining = await prisma.authSession.findUnique({
      where: {
        tokenHash: hashSessionToken(session.token),
      },
    });

    assert(
      !remaining,
      "Signout/revoke did not remove the exact test session.",
    );

    console.log("  PASS - signin, session, authorization and revoke all correct.");
  }

  console.log("");
  console.log("SECTION 5.9 PASSED.");
  console.log("Reader, Writer and Admin development accounts match the real auth stack.");
}

main()
  .catch((error) => {
    console.error("");
    console.error("SECTION 5.9 FAILED.");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    const prisma = getPrismaClient();
    if (prisma) {
      await prisma.$disconnect();
    }
  });