import "dotenv/config";
import { RoleKey } from "../src/generated/prisma/client";
import { hashPassword, validatePassword } from "../src/lib/password";
import { getPrismaClient } from "../src/lib/prisma";

const DEV_USERS = [
  {
    email: "reader@bookshop.local",
    username: "bookshop-reader",
    name: "Bookshop Reader",
    activeRole: RoleKey.READER,
    roles: [RoleKey.READER],
  },
  {
    email: "writer@bookshop.local",
    username: "bookshop-writer",
    name: "Bookshop Writer",
    activeRole: RoleKey.WRITER,
    roles: [RoleKey.READER, RoleKey.WRITER],
  },
  {
    email: "admin@bookshop.local",
    username: "bookshop-admin",
    name: "Bookshop Administrator",
    activeRole: RoleKey.ADMIN,
    roles: [RoleKey.READER, RoleKey.WRITER, RoleKey.ADMIN],
  },
] as const;

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Development test users must never be seeded in production.");
  }

  const password = process.env.DEV_TEST_USER_PASSWORD;

  if (!password) {
    throw new Error("DEV_TEST_USER_PASSWORD is not configured in .env.");
  }

  const validation = validatePassword(password);
  if (!validation.valid) {
    throw new Error(validation.message ?? "Development password is invalid.");
  }

  const prisma = getPrismaClient();
  if (!prisma) {
    throw new Error("Prisma client is unavailable.");
  }

  const roleRows = await prisma.role.findMany();
  const roleByKey = new Map(roleRows.map((role) => [role.key, role]));

  for (const required of [RoleKey.READER, RoleKey.WRITER, RoleKey.ADMIN]) {
    if (!roleByKey.has(required)) {
      throw new Error(`Required role ${required} is missing.`);
    }
  }

  const passwordHash = await hashPassword(password);

  for (const devUser of DEV_USERS) {
    const user = await prisma.user.upsert({
      where: {
        email: devUser.email,
      },
      update: {
        passwordHash,
        name: devUser.name,
        username: devUser.username,
        avatar: devUser.name
          .split(/\s+/)
          .map((part) => part[0])
          .join("")
          .slice(0, 2)
          .toUpperCase(),
        activeRole: devUser.activeRole,
        goals:
          devUser.activeRole === RoleKey.READER
            ? ["reading"]
            : ["reading", "writing"],
      },
      create: {
        email: devUser.email,
        passwordHash,
        name: devUser.name,
        username: devUser.username,
        avatar: devUser.name
          .split(/\s+/)
          .map((part) => part[0])
          .join("")
          .slice(0, 2)
          .toUpperCase(),
        activeRole: devUser.activeRole,
        goals:
          devUser.activeRole === RoleKey.READER
            ? ["reading"]
            : ["reading", "writing"],
      },
    });

    await prisma.userRoleAssignment.deleteMany({
      where: {
        userId: user.id,
      },
    });

    await prisma.userRoleAssignment.createMany({
      data: devUser.roles.map((roleKey) => ({
        userId: user.id,
        roleId: roleByKey.get(roleKey)!.id,
      })),
      skipDuplicates: true,
    });

    await prisma.authSession.deleteMany({
      where: {
        userId: user.id,
      },
    });

    console.log(
      `Seeded ${devUser.activeRole}: ${devUser.email}`,
    );
  }

  console.log("");
  console.log("Development authentication users are ready.");
  console.log("Password was read from DEV_TEST_USER_PASSWORD and was not printed.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    const prisma = getPrismaClient();
    if (prisma) {
      await prisma.$disconnect();
    }
  });