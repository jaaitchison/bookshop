import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { seedLegacyCatalog } from "./catalog-seed";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not configured.");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

async function main() {
  const result = await seedLegacyCatalog(prisma, { overwriteExisting: true });

  console.log("");
  console.log("Catalogue import complete.");
  console.log(`Source: ${result.sourcePath}`);
  console.log(`Source books: ${result.sourceCount}`);
  console.log(`Created: ${result.created}`);
  console.log(`Updated: ${result.updated}`);
  console.log(`Books currently in database: ${result.databaseCount}`);
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
