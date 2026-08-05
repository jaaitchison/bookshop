import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, RoleKey } from "../src/generated/prisma/client";
import { seedLegacyCatalog } from "./catalog-seed";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not configured.");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

async function main() {
  const roles = [
    {
      key: RoleKey.READER,
      name: "Reader",
      description: "Front of House customer and reading access.",
    },
    {
      key: RoleKey.WRITER,
      name: "Writer",
      description: "Writers Back Office publishing access.",
    },
    {
      key: RoleKey.ADMIN,
      name: "Administrator",
      description: "Administration and platform management access.",
    },
  ];

  for (const role of roles) {
    await prisma.role.upsert({
      where: { key: role.key },
      update: {
        name: role.name,
        description: role.description,
      },
      create: role,
    });
  }

  console.log("Seeded Reader, Writer and Administrator roles.");

  const catalog = await seedLegacyCatalog(prisma);
  console.log(`Seeded ${catalog.sourceCount} catalogue books from ${catalog.sourcePath}.`);
  console.log(`Created: ${catalog.created}; updated: ${catalog.updated}; database total: ${catalog.databaseCount}.`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
