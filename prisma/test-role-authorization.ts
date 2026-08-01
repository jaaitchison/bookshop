import "dotenv/config";
import { RoleKey } from "../src/generated/prisma/client";
import { getPrismaClient } from "../src/lib/prisma";
import { hashPassword } from "../src/lib/password";
import {
  getUserRoleKeys,
  roleKeySatisfies,
  userHasRole,
} from "../src/lib/role-authorization";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

async function main() {
  const prisma = getPrismaClient();
  assert(prisma, "Prisma client is unavailable.");

  const suffix = Date.now().toString(36);
  const email = `section-5-6-${suffix}@example.test`;
  const username = `roles-${suffix}`.slice(0, 32);

  const roles = await prisma.role.findMany();
  const reader = roles.find((role) => role.key === RoleKey.READER);
  const writer = roles.find((role) => role.key === RoleKey.WRITER);
  const admin = roles.find((role) => role.key === RoleKey.ADMIN);

  assert(reader && writer && admin, "Required roles are missing.");

  const user = await prisma.user.create({
    data: {
      email,
      username,
      name: "Section 5.6 Role User",
      passwordHash: await hashPassword("RoleTest2026Password"),
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
    console.log("");
    console.log("SECTION 5.6 server-side role authorization test");
    console.log("");

    console.log("1. Reader-only user");

    assert(await userHasRole(user.id, "reader"), "Reader role not recognized.");
    assert(!(await userHasRole(user.id, "writer")), "Reader incorrectly has Writer access.");
    assert(!(await userHasRole(user.id, "admin")), "Reader incorrectly has Admin access.");

    console.log("   PASS - Reader only gets Reader access.");

    console.log("");
    console.log("2. Add Writer in PostgreSQL");

    await prisma.userRoleAssignment.create({
      data: {
        userId: user.id,
        roleId: writer.id,
      },
    });

    assert(await userHasRole(user.id, "writer"), "Writer assignment not recognized.");
    assert(!(await userHasRole(user.id, "admin")), "Writer incorrectly has Admin access.");

    console.log("   PASS - Writer access appears only after database assignment.");

    console.log("");
    console.log("3. Add Admin in PostgreSQL");

    await prisma.userRoleAssignment.create({
      data: {
        userId: user.id,
        roleId: admin.id,
      },
    });

    assert(await userHasRole(user.id, "admin"), "Admin assignment not recognized.");
    assert(await userHasRole(user.id, "writer"), "Admin should satisfy Writer access.");
    assert(await userHasRole(user.id, "reader"), "Admin should satisfy Reader access.");

    console.log("   PASS - Admin satisfies Admin, Writer and Reader checks.");

    console.log("");
    console.log("4. Remove elevated roles");

    await prisma.userRoleAssignment.deleteMany({
      where: {
        userId: user.id,
        roleId: {
          in: [writer.id, admin.id],
        },
      },
    });

    const finalKeys = await getUserRoleKeys(user.id);

    assert(
      finalKeys.length === 1 && finalKeys[0] === RoleKey.READER,
      "Elevated roles were not removed cleanly.",
    );

    assert(!roleKeySatisfies(finalKeys, "writer"), "Reader keys still satisfy Writer.");
    assert(!roleKeySatisfies(finalKeys, "admin"), "Reader keys still satisfy Admin.");

    console.log("   PASS - removing database assignments removes elevated access.");

    console.log("");
    console.log("SECTION 5.6 PASSED.");
  } finally {
    await prisma.user.delete({
      where: {
        id: user.id,
      },
    }).catch(() => undefined);

    console.log("Temporary role test user cleaned up.");
  }
}

main()
  .catch((error) => {
    console.error("");
    console.error("SECTION 5.6 FAILED.");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    const prisma = getPrismaClient();
    if (prisma) {
      await prisma.$disconnect();
    }
  });