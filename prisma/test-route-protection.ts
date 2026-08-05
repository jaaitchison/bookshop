import "dotenv/config";
import { RoleKey } from "../src/generated/prisma/client";
import { GET as authorize } from "../app/api/auth/authorize/route";
import {
  createDatabaseSession,
  DATABASE_AUTH_COOKIE,
} from "../src/lib/database-session";
import { hashPassword } from "../src/lib/password";
import { getPrismaClient } from "../src/lib/prisma";
import {
  getRequiredRoleForPath,
  isProtectedPath,
} from "../src/lib/route-protection";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

async function callAuthorize(
  token: string | null,
  role: "reader" | "writer" | "admin",
) {
  const headers = new Headers();

  if (token) {
    headers.set("cookie", `${DATABASE_AUTH_COOKIE}=${token}`);
  }

  return authorize(
    new Request(`http://localhost/api/auth/authorize?role=${role}`, {
      method: "GET",
      headers,
    }),
  );
}

async function main() {
  const prisma = getPrismaClient();
  assert(prisma, "Prisma client is unavailable.");

  const suffix = Date.now().toString(36);
  const email = `section-5-8-${suffix}@example.test`;
  const username = `proxy-${suffix}`.slice(0, 32);

  const roles = await prisma.role.findMany();
  const reader = roles.find((role) => role.key === RoleKey.READER);
  const writer = roles.find((role) => role.key === RoleKey.WRITER);
  const admin = roles.find((role) => role.key === RoleKey.ADMIN);

  assert(reader && writer && admin, "Required roles are missing.");

  const user = await prisma.user.create({
    data: {
      email,
      username,
      name: "Section 5.8 Proxy User",
      passwordHash: await hashPassword("ProxyTest2026Password"),
      avatar: "S5",
      goals: ["reading"],
      activeRole: RoleKey.READER,
      roles: {
        create: {
          roleId: reader.id,
        },
      },
    },
  });

  try {
    const session = await createDatabaseSession(user.id);

    console.log("");
    console.log("SECTION 5.8 route protection test");
    console.log("");

    console.log("1. Route policy");

    assert(isProtectedPath("/library"), "/library should be protected.");
    assert(isProtectedPath("/account"), "/account should be protected.");
    assert(isProtectedPath("/checkout"), "/checkout should be protected.");
    assert(isProtectedPath("/studio"), "/studio should be protected.");
    assert(isProtectedPath("/admin"), "/admin should be protected.");
    assert(!isProtectedPath("/books"), "/books should remain public.");
    assert(!isProtectedPath("/administrator"), "Route-prefix lookalikes should remain public.");

    assert(getRequiredRoleForPath("/library") === "reader", "Library role wrong.");
    assert(getRequiredRoleForPath("/account") === "reader", "Account role wrong.");
    assert(getRequiredRoleForPath("/checkout/success") === "reader", "Checkout role wrong.");
    assert(getRequiredRoleForPath("/studio") === "writer", "Studio role wrong.");
    assert(getRequiredRoleForPath("/admin") === "admin", "Admin role wrong.");

    console.log("   PASS - protected routes map to the correct required role.");

    console.log("");
    console.log("2. Missing V2 session");

    const noSession = await callAuthorize(null, "reader");
    assert(noSession.status === 401, "Missing session should return 401.");

    console.log("   PASS - missing session is unauthenticated.");

    console.log("");
    console.log("3. Reader session");

    const readerAccess = await callAuthorize(session.token, "reader");
    const writerDenied = await callAuthorize(session.token, "writer");
    const adminDenied = await callAuthorize(session.token, "admin");

    assert(readerAccess.status === 200, "Reader should access Reader route.");
    assert(writerDenied.status === 403, "Reader should be denied Writer route.");
    assert(adminDenied.status === 403, "Reader should be denied Admin route.");

    console.log("   PASS - Reader is allowed only Reader-level protected routes.");

    console.log("");
    console.log("4. Live database Writer assignment");

    await prisma.userRoleAssignment.create({
      data: {
        userId: user.id,
        roleId: writer.id,
      },
    });

    const writerAccess = await callAuthorize(session.token, "writer");
    assert(writerAccess.status === 200, "Writer DB assignment was not recognized.");

    console.log("   PASS - existing session sees new Writer DB role immediately.");

    console.log("");
    console.log("5. Live database Admin assignment");

    await prisma.userRoleAssignment.create({
      data: {
        userId: user.id,
        roleId: admin.id,
      },
    });

    const adminAccess = await callAuthorize(session.token, "admin");
    assert(adminAccess.status === 200, "Admin DB assignment was not recognized.");

    console.log("   PASS - existing session sees new Admin DB role immediately.");

    console.log("");
    console.log("6. Legacy cookie independence");

    const fakeLegacyHeaders = new Headers({
      cookie:
        'bookshop_session=%7B%22roles%22%3A%7B%22reader%22%3Atrue%2C%22writer%22%3Atrue%2C%22admin%22%3Atrue%7D%7D',
    });

    const legacyOnly = await authorize(
      new Request(
        "http://localhost/api/auth/authorize?role=admin",
        { headers: fakeLegacyHeaders },
      ),
    );

    assert(
      legacyOnly.status === 401,
      "Legacy encoded role cookie must not authorize access.",
    );

    console.log("   PASS - old encoded profile cookie has no authority.");

    console.log("");
    console.log("SECTION 5.8 PASSED.");
  } finally {
    await prisma.authSession.deleteMany({
      where: { userId: user.id },
    });

    await prisma.user.delete({
      where: { id: user.id },
    }).catch(() => undefined);

    console.log("Temporary proxy test records cleaned up.");
  }
}

main()
  .catch((error) => {
    console.error("");
    console.error("SECTION 5.8 FAILED.");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    const prisma = getPrismaClient();
    if (prisma) {
      await prisma.$disconnect();
    }
  });
