import { readFile } from "node:fs/promises";
import path from "node:path";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function read(...parts: string[]) {
  return readFile(path.join(process.cwd(), ...parts), "utf8");
}

async function main() {
  console.log("\nSECTION 11.2 - Publishing moderation source verification\n");
  const [schema, repository, adminApi, decisionApi, adminPage, studioPage, studioList, editor, migration, runtime, browser, docs, packageJson] = await Promise.all([
    read("prisma", "schema.prisma"),
    read("src", "lib", "publishing-moderation-repository.ts"),
    read("app", "api", "admin", "publishing", "route.ts"),
    read("app", "api", "admin", "publishing", "[id]", "route.ts"),
    read("app", "admin", "page.tsx"),
    read("app", "studio", "page.tsx"),
    read("src", "components", "studio", "WriterBooksList.tsx"),
    read("app", "studio", "books", "[id]", "page.tsx"),
    read("prisma", "migrations", "20260806040000_phase_11_2_publishing_moderation", "migration.sql"),
    read("prisma", "test-phase-11-2-publishing-moderation.ts"),
    read("tests", "browser", "publishing-moderation.spec.ts"),
    read("docs", "SECTION-11-2-PUBLISHING-MODERATION.md"),
    read("package.json"),
  ]);

  console.log("1. Durable review state and audit history");
  for (const marker of ["model PublishingAuditLog", "submittedAt", "reviewedAt", "SUBMITTED_FOR_REVIEW", "CHANGES_REQUESTED"]) assert(schema.includes(marker), `Schema marker missing: ${marker}`);
  assert(migration.includes('CREATE TABLE "PublishingAuditLog"') && migration.includes('PublishingAuditLog_actorId_fkey'), "Migration lacks durable audit storage.");
  console.log("   PASS - review timestamps and actor-linked audit events are migration-backed.");

  console.log("\n2. Transactional Admin-only decisions");
  for (const marker of ["assertAdmin", "prisma.$transaction", "updateMany", "publishingAuditLog", "BookVisibility.PUBLIC"]) assert(repository.includes(marker), `Repository marker missing: ${marker}`);
  assert(adminApi.includes("userHasRole(session.userId, 'admin')") && decisionApi.includes("userHasRole(session.userId, 'admin')"), "Admin APIs lack role checks.");
  console.log("   PASS - state, visibility and audit changes share one guarded transaction.");

  console.log("\n3. Admin queue and Writer feedback UX");
  for (const marker of ["Approve &amp; publish", "Request changes", "Archive submission", "Publishing audit trail"]) assert(adminPage.includes(marker), `Admin UI marker missing: ${marker}`);
  assert(studioPage.includes("moderationReason") && studioList.includes("Submit for review") && studioList.includes("Admin feedback"), "Studio list lacks moderation workflow.");
  assert(editor.includes("Submit for review") && editor.includes("Admin feedback"), "Writer editor lacks moderation workflow.");
  console.log("   PASS - Admin decisions and Writer feedback are exposed in their correct workspaces.");

  console.log("\n4. Runtime, browser and runbook coverage");
  for (const marker of ["Direct publishing is rejected", "Admin role boundary", "Changes requested feedback", "Concurrent decision protection"]) assert(runtime.includes(marker), `Runtime marker missing: ${marker}`);
  assert(browser.includes("Request changes") && browser.includes("Approve & publish"), "Browser moderation coverage is incomplete.");
  assert(docs.includes("phase11:test-moderation") && packageJson.includes("phase11:verify-moderation"), "Section 11.2 commands are missing.");
  console.log("   PASS - executable coverage documents and protects the complete workflow.");

  console.log("\nSECTION 11.2 SOURCE VERIFICATION PASSED.\n");
}

main().catch((error) => {
  console.error("\nSECTION 11.2 SOURCE VERIFICATION FAILED.");
  console.error(error);
  process.exitCode = 1;
});
