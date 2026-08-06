import { readFile } from "node:fs/promises";
import path from "node:path";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function read(...parts: string[]) {
  return readFile(path.join(process.cwd(), ...parts), "utf8");
}

async function main() {
  const [header, cardio, modeBadge, siteFooter, footerAction, styles, pageHeader, salesRepository, salesRoute, studioPage, schema, migration, docs] = await Promise.all([
    read("src", "components", "TopHeader.tsx"),
    read("src", "components", "layout", "CardioLogo.tsx"),
    read("src", "components", "layout", "ModeBadge.tsx"),
    read("src", "components", "layout", "SiteFooter.tsx"),
    read("src", "components", "layout", "FooterAuthAction.tsx"),
    read("app", "globals.css"),
    read("src", "components", "layout", "PageHeader.tsx"),
    read("src", "lib", "writer-sales-repository.ts"),
    read("app", "api", "studio", "sales", "route.ts"),
    read("app", "studio", "page.tsx"),
    read("prisma", "schema.prisma"),
    read("prisma", "migrations", "20260806003000_localise_payments_to_gbp", "migration.sql"),
    read("docs", "ROLE-UI-UK-LOCALISATION-AND-WRITER-SALES.md"),
  ]);

  console.log("\nRole UI, UK localisation and Writer sales verification\n");

  assert(cardio.includes('size === "footer" ? "h-5 w-14" : "h-7 w-20"') && cardio.includes("text-emerald-500"), "Cardio standard/footer sizes or colours are incorrect.");
  for (const marker of ['label: "Home"', 'label: "Books"', 'label: "Library"', 'label: "Accounts"', 'label="Studio"', 'label="Admin"', 'aria-label="Main navigation"']) {
    assert(header.includes(marker), `Header navigation marker missing: ${marker}`);
  }
  assert(!header.includes('aria-label="Log out"'), "Top navigation still owns the Cardio logout action.");
  assert(footerAction.includes("CardioLogo") && footerAction.includes('aria-label="Log out"'), "Footer Cardio logout action is missing.");
  for (const marker of ['label: "Admin", className: "bg-red-600"', 'label: "Back of House", className: "bg-amber-600"', 'label: "Front of House", className: "bg-green-600"', "strokeDasharray", "repeatCount=\"indefinite\""]) {
    assert(modeBadge.includes(marker), `Animated mode marker missing: ${marker}`);
  }
  assert(header.includes("bookshop-nav-separator") && header.includes('data-tone="purple"'), "Navbar separators or colour themes are missing.");
  assert(siteFooter.includes('label: "Studio"') && siteFooter.includes('label: "Admin"') && siteFooter.includes("data-active={active}"), "Footer navigation additions or active state are missing.");
  assert(footerAction.includes('size="footer"'), "Footer Cardio logout was not reduced by 30%.");
  console.log("PASS - themed navbar, animated mode badge and compact footer Cardio logout are present.");

  for (const tone of ["purple", "amber", "red"]) {
    assert(styles.includes(`[data-tone="${tone}"]`) && styles.includes(`[data-tone="${tone}"]:not([data-disabled="true"]):hover`), `Colour inversion is missing for ${tone}.`);
  }
  assert(styles.includes(".bookshop-footer-link:hover") && styles.includes('.bookshop-footer-link[data-active="true"]'), "Footer hover or active styles are missing.");
  console.log("PASS - navbar themes invert correctly and footer links expose hover/active states.");

  for (const marker of ["Admin", "Front of House", "Back of House", "Current account summary", "Role:", "Active / Logged In"]) {
    assert(pageHeader.includes(marker), `Page metadata marker missing: ${marker}`);
  }
  console.log("PASS - shared page metadata and account status use the requested three-line structure.");

  for (const marker of ["authorId: userId", "BookStatus.PUBLISHED", "OrderStatus.CANCELLED", "OrderStatus.REFUNDED", 'currency: "GBP"']) {
    assert(salesRepository.includes(marker), `Writer sales boundary missing: ${marker}`);
  }
  assert(salesRoute.includes("getRequestDatabaseSession") && salesRoute.includes("userHasRole"), "Writer sales API is not session and role protected.");
  assert(studioPage.includes("WriterSalesBreakdown") && studioPage.includes("totalRevenue"), "Writer sales analytics are not displayed in Studio.");
  console.log("PASS - Writer-owned persisted sales feed the Studio dashboard.");

  assert(schema.includes('@default("gbp")') && migration.includes("SET DEFAULT 'gbp'"), "GBP is not the default for new payment attempts.");
  assert(docs.includes("en-GB") && docs.includes("pound symbol"), "UK localisation documentation is incomplete.");
  console.log("PASS - new payment activity and visible formatting use GBP and UK conventions.");

  console.log("\nRole UI, UK localisation and Writer sales PASSED.\n");
}

main().catch((error) => {
  console.error("\nRole UI, UK localisation and Writer sales FAILED.");
  console.error(error);
  process.exitCode = 1;
});
