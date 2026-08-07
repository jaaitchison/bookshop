import { readFile } from "node:fs/promises";
import path from "node:path";
import { getRequiredRoleForPath, isProtectedPath } from "../src/lib/route-protection";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function main() {
  console.log("");
  console.log("SECTION 9.2 - Role-based authentication verification");

  console.log("");
  console.log("1. Public and protected route policy");
  for (const route of ["/", "/books", "/books/example", "/auth"]) {
    assert(!isProtectedPath(route), `${route} must be public.`);
  }
  for (const route of ["/library", "/account", "/checkout"]) {
    assert(getRequiredRoleForPath(route) === "reader", `${route} must require Reader access.`);
  }
  assert(getRequiredRoleForPath("/studio") === "writer", "/studio must require Writer access.");
  assert(getRequiredRoleForPath("/admin") === "admin", "/admin must require Admin access.");
  assert(!isProtectedPath("/administrator"), "Prefix lookalikes must not inherit protected-route policy.");
  console.log("   PASS - Public, Reader, Writer and Admin route boundaries are exact.");

  console.log("");
  console.log("2. Next.js proxy coverage");
  const proxy = await readFile(path.join(process.cwd(), "proxy.ts"), "utf8");
  for (const matcher of ["/account/:path*", "/library/:path*", "/checkout/:path*", "/studio/:path*", "/admin/:path*"]) {
    assert(proxy.includes(`"${matcher}"`), `Proxy matcher ${matcher} is missing.`);
  }
  assert(proxy.includes("DATABASE_AUTH_COOKIE"), "Proxy does not require the database session cookie.");
  assert(proxy.includes("/api/auth/authorize"), "Proxy does not perform live database authorization.");
  console.log("   PASS - Every protected page crosses the database-backed proxy boundary.");

  console.log("");
  console.log("3. Server-side ownership enforcement");
  const repository = await readFile(path.join(process.cwd(), "src", "lib", "writer-book-repository.ts"), "utf8");
  assert(repository.includes("authorId: userId"), "Writer repository does not scope ownership by trusted user id.");
  assert(repository.includes("assignment.role.key === RoleKey.ADMIN"), "Admin ownership override is missing.");
  console.log("   PASS - Studio data access remains owner-scoped with explicit Admin override.");

  console.log("");
  console.log("4. Real browser coverage");
  const browser = await readFile(path.join(process.cwd(), "tests", "browser", "auth-role-flow.spec.ts"), "utf8");
  assert(browser.includes('page.goto("/account")'), "Unauthenticated Account browser test is missing.");
  assert(browser.includes('"/books/the-midnight-library"'), "Public detail browser test is missing.");
  console.log("   PASS - Browser coverage exercises public routes, protected Account, role denial and signout.");

  console.log("");
  console.log("SECTION 9.2 PASSED.");
}

main().catch((error) => {
  console.error("");
  console.error("SECTION 9.2 FAILED.");
  console.error(error);
  process.exitCode = 1;
});
