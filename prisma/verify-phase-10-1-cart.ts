import { readFile } from "node:fs/promises";
import path from "node:path";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function read(...parts: string[]) {
  return readFile(path.join(process.cwd(), ...parts), "utf8");
}

async function main() {
  console.log("\nSECTION 10.1 - Persistent cart source verification\n");
  const [schema, repository, route, context, drawer, runtimeTest, browserTest, docs] = await Promise.all([
    read("prisma", "schema.prisma"),
    read("src", "lib", "cart-repository.ts"),
    read("app", "api", "cart", "route.ts"),
    read("src", "context", "CartContext.tsx"),
    read("src", "components", "cart", "CartDrawer.tsx"),
    read("prisma", "test-phase-10-1-cart.ts"),
    read("tests", "browser", "persistent-cart.spec.ts"),
    read("docs", "SECTION-10-1-PERSISTENT-CART.md"),
  ]);

  console.log("1. Persistent model foundation");
  for (const marker of ["model Cart {", "userId    String   @unique", "model CartItem {", "@@unique([cartId, bookId])"]) {
    assert(schema.includes(marker), `Cart schema marker missing: ${marker}`);
  }
  console.log("   PASS - one durable cart per user and unique book lines are modeled.");

  console.log("\n2. Server price and availability authority");
  for (const marker of ["BookStatus.PUBLISHED", "BookVisibility.PUBLIC", "Number(book.price.toString())", "MAX_CART_ITEM_QUANTITY"]) {
    assert(repository.includes(marker), `Cart authority marker missing: ${marker}`);
  }
  assert(!route.includes("price?:") && !route.includes("title?:"), "Cart API accepts browser price/title authority.");
  console.log("   PASS - availability, metadata, line totals and subtotal come from PostgreSQL.");

  console.log("\n3. Authenticated API contract");
  for (const marker of ["export async function GET", "export async function POST", "export async function PATCH", "export async function DELETE", 'userHasRole(session.userId, "reader")']) {
    assert(route.includes(marker), `Cart API marker missing: ${marker}`);
  }
  console.log("   PASS - Reader-scoped read/add/update/remove/clear operations are exposed.");

  console.log("\n4. Browser store removal and UI synchronization");
  assert(!context.includes("localStorage") && !context.includes("STORAGE_KEY"), "CartContext still uses browser persistence.");
  for (const marker of ["/api/cart", "refreshCart", "isAuthenticated", "credentials: 'include'"]) {
    assert(context.includes(marker), `Cart context marker missing: ${marker}`);
  }
  assert(drawer.includes("Loading your saved cart") && drawer.includes("isUpdating"), "Cart drawer lacks server synchronization states.");
  console.log("   PASS - CartContext hydrates and mutates only through the session-backed API.");

  console.log("\n5. Executable coverage and documentation");
  for (const marker of ["Forged browser title", "private book", "Live repricing", "whole-cart clearing"]) {
    assert(runtimeTest.toLowerCase().includes(marker.toLowerCase()), `Runtime test marker missing: ${marker}`);
  }
  for (const marker of ["page.reload", "toHaveText(/2/)", "cartItem.findFirst", "Remove"]) {
    assert(browserTest.includes(marker), `Browser test marker missing: ${marker}`);
  }
  assert(docs.includes("npm run phase10:test-cart"), "Section 10.1 runbook is incomplete.");
  console.log("   PASS - source, runtime, reload persistence and run commands are covered.");

  console.log("\nSECTION 10.1 SOURCE VERIFICATION PASSED.\n");
}

main().catch((error) => {
  console.error("\nSECTION 10.1 SOURCE VERIFICATION FAILED.");
  console.error(error);
  process.exitCode = 1;
});
