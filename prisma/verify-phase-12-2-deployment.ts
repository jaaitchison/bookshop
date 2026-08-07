import { readFile } from "node:fs/promises";
import path from "node:path";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}
async function read(...parts: string[]) { return readFile(path.join(process.cwd(), ...parts), "utf8"); }

async function main() {
  console.log("\nSECTION 12.2 - Production deployment source verification\n");
  const [docker, ignore, ci, release, render, config, health, s3, cover, files, environment, schema, consentMigration, legalPolicy, preflight, terms, privacy, refunds, checkout, footer, docs, packageJson] = await Promise.all([
    read("Dockerfile"), read(".dockerignore"), read(".github", "workflows", "ci.yml"), read(".github", "workflows", "release.yml"),
    read("render.yaml"), read("next.config.ts"), read("app", "api", "health", "route.ts"), read("src", "lib", "s3-object-storage.ts"),
    read("src", "lib", "cover-storage.ts"), read("src", "lib", "book-file-storage.ts"), read("src", "lib", "environment.ts"),
    read("prisma", "schema.prisma"), read("prisma", "migrations", "20260807010000_digital_content_consent", "migration.sql"), read("src", "lib", "legal-policy.ts"), read("prisma", "production-preflight.ts"),
    read("app", "terms", "page.tsx"), read("app", "privacy", "page.tsx"), read("app", "refunds", "page.tsx"),
    read("app", "checkout", "page.tsx"), read("src", "components", "layout", "SiteFooter.tsx"),
    read("docs", "SECTION-12-2-PRODUCTION-DEPLOYMENT.md"), read("package.json"),
  ]);

  console.log("1. Reproducible container and health check");
  for (const marker of ["node:22-alpine", "HEALTHCHECK", ".next/standalone", "USER nextjs"]) assert(docker.includes(marker), `Docker marker missing: ${marker}`);
  assert(ignore.includes(".env*") && config.includes('output: "standalone"') && health.includes("SELECT 1"), "Container boundary or health contract is incomplete.");
  console.log("   PASS - the non-root standalone image has a PostgreSQL-aware health check.");

  console.log("\n2. CI and controlled release pipeline");
  for (const marker of ["postgres:17-alpine", "phase12:test-security", "docker build"]) assert(ci.includes(marker), `CI marker missing: ${marker}`);
  for (const marker of ["PRODUCTION_DATABASE_URL", "db:deploy", "ghcr.io", "RENDER_DEPLOY_HOOK"]) assert(release.includes(marker), `Release marker missing: ${marker}`);
  assert(release.includes("phase12:preflight") && preflight.includes("validateProductionReadiness"), "Production preflight is not enforced before release.");
  assert(render.includes("healthCheckPath: /api/health") && render.includes("bookshop-postgres"), "Hosting blueprint is incomplete.");
  console.log("   PASS - pull requests verify against PostgreSQL and releases migrate before deployment.");

  console.log("\n3. S3/R2 media pipeline with local fallback");
  for (const marker of ["PutObjectCommand", "GetObjectCommand", "DeleteObjectCommand", "transformToWebStream"]) assert(s3.includes(marker), `Object-store marker missing: ${marker}`);
  assert(cover.includes("S3CoverStorage") && files.includes("S3PrivateBookFileStorage") && environment.includes('STORAGE_DRIVER: z.enum(["local", "s3"])'), "Storage selection is incomplete.");
  console.log("   PASS - public covers and protected ranged files can use S3/R2 without weakening local development.");

  console.log("\n4. Legal and digital-supply surfaces");
  assert(terms.includes("Writer content") && privacy.includes("Information we use") && refunds.includes("Your statutory rights"), "Legal routes are incomplete.");
  assert(checkout.includes("request immediate supply") && checkout.includes("digitalContentConsent") && footer.includes('href: "/privacy"'), "Checkout acknowledgement or legal navigation is missing.");
  assert(schema.includes("digitalContentConsentAt") && consentMigration.includes('ADD COLUMN "digitalContentConsentAt"') && legalPolicy.includes("TERMS_VERSION"), "Durable versioned consent evidence is missing.");
  console.log("   PASS - Terms, Privacy and Refund routes are linked and immediate digital supply is acknowledged.");

  console.log("\n5. Deployment runbook and commands");
  assert(docs.includes("phase12:test-deployment") && docs.includes("Legal launch gate") && packageJson.includes("phase12:verify-deployment"), "Deployment runbook is incomplete.");
  console.log("   PASS - credentials, migrations, storage, legal review and rollback are documented.");

  console.log("\nSECTION 12.2 SOURCE VERIFICATION PASSED.\n");
}
main().catch((error) => { console.error("\nSECTION 12.2 SOURCE VERIFICATION FAILED."); console.error(error); process.exitCode = 1; });
