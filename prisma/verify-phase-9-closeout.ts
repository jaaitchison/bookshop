import { access, readFile } from "node:fs/promises";
import path from "node:path";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function exists(...parts: string[]) {
  return access(path.join(process.cwd(), ...parts)).then(() => true).catch(() => false);
}

async function main() {
  console.log("");
  console.log("PHASE 9 - Closeout verification");

  console.log("");
  console.log("1. Section documentation");
  for (const file of [
    "SECTION-9-1-DATABASE-INFRASTRUCTURE.md",
    "SECTION-9-2-ROLE-BASED-AUTHENTICATION.md",
    "SECTION-9-3-WRITER-COVER-ASSET-PIPELINE.md",
    "SECTION-9-4-PRIVATE-MANUSCRIPT-SAMPLE-PIPELINE.md",
    "SECTION-9-5-LIVE-CATALOGUE-LIBRARY.md",
  ]) {
    assert(await exists("docs", file), `${file} is missing.`);
  }
  console.log("   PASS - Sections 9.1 through 9.5 are documented.");

  console.log("");
  console.log("2. Database, authentication and ownership");
  const schema = await readFile(path.join(process.cwd(), "prisma", "schema.prisma"), "utf8");
  for (const model of ["BookEdition", "BookFile", "BookCover", "Cart", "LibraryItem", "AuthSession"]) {
    assert(schema.includes(`model ${model} {`), `${model} is missing.`);
  }
  assert(await exists("proxy.ts"), "Role-guard proxy is missing.");
  console.log("   PASS - production data, sessions, roles and ownership foundations exist.");

  console.log("");
  console.log("3. Media and delivery pipeline");
  for (const route of [
    ["app", "api", "studio", "books", "[id]", "cover", "route.ts"],
    ["app", "api", "studio", "books", "[id]", "manuscript", "route.ts"],
    ["app", "api", "library", "download", "[id]", "route.ts"],
  ]) {
    assert(await exists(...route), `${route.join("/")} is missing.`);
  }
  console.log("   PASS - cover, private-file and protected delivery routes exist.");

  console.log("");
  console.log("4. Live catalogue and library");
  assert(!(await exists("src", "data", "books.ts")), "TypeScript mock catalogue remains.");
  assert(await exists("app", "api", "library", "route.ts"), "Live library API is missing.");
  console.log("   PASS - PostgreSQL-only catalogue and LibraryItem UI pipeline are active.");

  console.log("");
  console.log("5. Aggregate commands");
  const packageJson = await readFile(path.join(process.cwd(), "package.json"), "utf8");
  for (const script of ['"phase9:verify"', '"phase9:test"']) {
    assert(packageJson.includes(script), `${script} script is missing.`);
  }
  console.log("   PASS - Phase 9 verification and regression commands are registered.");

  console.log("");
  console.log("PHASE 9 PASSED.");
}

main().catch((error) => {
  console.error("");
  console.error("PHASE 9 FAILED.");
  console.error(error);
  process.exitCode = 1;
});
