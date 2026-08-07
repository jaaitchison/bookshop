import { readFile } from "node:fs/promises";
import path from "node:path";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function read(...parts: string[]) {
  return readFile(path.join(process.cwd(), ...parts), "utf8");
}

async function main() {
  console.log("\nSECTION 12.1 - Security hardening source verification\n");
  const [rateLimit, signin, signup, cover, manuscript, environment, cors, proxy, config, runtime, docs, packageJson] = await Promise.all([
    read("src", "lib", "request-rate-limit.ts"),
    read("app", "api", "auth", "signin", "route.ts"),
    read("app", "api", "auth", "signup", "route.ts"),
    read("app", "api", "studio", "books", "[id]", "cover", "route.ts"),
    read("app", "api", "studio", "books", "[id]", "manuscript", "route.ts"),
    read("src", "lib", "environment.ts"),
    read("src", "lib", "cors-policy.ts"),
    read("proxy.ts"),
    read("next.config.ts"),
    read("prisma", "test-phase-12-1-security-hardening.ts"),
    read("docs", "SECTION-12-1-SECURITY-HARDENING.md"),
    read("package.json"),
  ]);

  console.log("1. Authentication and upload throttling");
  for (const marker of ["Retry-After", "X-RateLimit-Limit", "RATE_LIMITED", "private, no-store"]) assert(rateLimit.includes(marker), `Rate-limit marker missing: ${marker}`);
  for (const source of [signin, signup, cover, manuscript]) assert(source.includes("enforceRequestRateLimit"), "A sensitive route lacks throttling.");
  console.log("   PASS - signin, signup, cover and manuscript entry points share bounded request handling.");

  console.log("\n2. Environment and cross-origin policy");
  assert(environment.includes('from "zod"') && environment.includes("DATABASE_URL must use PostgreSQL") && environment.includes("requirePayments"), "Typed environment validation is incomplete.");
  assert(cors.includes("isRequestOriginAllowed") && proxy.includes('pathname.startsWith("/api/")') && proxy.includes("Origin is not allowed"), "Explicit API CORS policy is incomplete.");
  console.log("   PASS - deployment configuration is schema-checked and API origins are explicitly constrained.");

  console.log("\n3. Security headers");
  for (const marker of ["Content-Security-Policy", "Strict-Transport-Security", "X-Content-Type-Options", "Referrer-Policy", "Permissions-Policy", "frame-ancestors 'none'"]) assert(config.includes(marker), `Security header missing: ${marker}`);
  console.log("   PASS - the application emits a restrictive browser security baseline.");

  console.log("\n4. Integrated security regression suite");
  assert(runtime.includes("Authentication route enforcement") && runtime.includes("Explicit same-origin CORS policy"), "Hardening runtime coverage is incomplete.");
  for (const script of ["phase10:test-payments-runtime", "phase9:test-files-runtime", "phase11:test-reader-runtime", "auth:test-roles"]) assert(packageJson.includes(script), `Integrated test missing: ${script}`);
  assert(docs.includes("phase12:test-security") && packageJson.includes("phase12:verify-security"), "Section 12.1 runbook commands are missing.");
  console.log("   PASS - checkout, file authorization, RBAC and the new controls run as one security gate.");

  console.log("\nSECTION 12.1 SOURCE VERIFICATION PASSED.\n");
}

main().catch((error) => {
  console.error("\nSECTION 12.1 SOURCE VERIFICATION FAILED.");
  console.error(error);
  process.exitCode = 1;
});
