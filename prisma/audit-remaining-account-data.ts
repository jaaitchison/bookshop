import "dotenv/config";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

type AuditItem = {
  area: string;
  source: string;
  currentStorage: string;
  databaseModel: string;
  section: string;
  notes: string;
};

async function exists(relative: string) {
  try {
    await readFile(path.join(process.cwd(), relative), "utf8");
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const items: AuditItem[] = [
    {
      area: "Orders",
      source: "src/lib/account-store.ts + /api/account + Stripe routes",
      currentStorage: "data/account-store.json ordersByProfile",
      databaseModel: "Order + OrderItem",
      section: "6.2",
      notes: "Migrate first. PostgreSQL becomes primary; JSON retained temporarily as fallback/mirror.",
    },
    {
      area: "Stripe processed event IDs",
      source: "src/lib/account-store.ts + /api/stripe/webhook",
      currentStorage: "data/account-store.json stripeProcessedEvents",
      databaseModel: "No dedicated model yet",
      section: "6.3",
      notes: "Leave in JSON during 6.2. Add database idempotency model in 6.3.",
    },
    {
      area: "Wishlist",
      source: "src/lib/wishlist-store.ts + /api/wishlist",
      currentStorage: "legacy/shared wishlist store",
      databaseModel: "WishlistItem",
      section: "6.4",
      notes: "Must become per-user through authenticated User.id.",
    },
    {
      area: "Reviews",
      source: "src/lib/reviews-store.ts + /api/books/[id]/reviews",
      currentStorage: "legacy review store",
      databaseModel: "Review",
      section: "6.5",
      notes: "Reviewer identity must come from authenticated user rather than submitted name.",
    },
    {
      area: "Editable account profile",
      source: "AccountContext + /account",
      currentStorage: "client memory / partial database fields",
      databaseModel: "User",
      section: "6.6",
      notes: "Persist editable profile fields through authenticated API.",
    },
    {
      area: "Browser order cache",
      source: "AccountContext + checkout success",
      currentStorage: "localStorage bookshop-account-orders-*",
      databaseModel: "Order + OrderItem",
      section: "6.7",
      notes: "Remove only after database order reads are fully proven.",
    },
  ];

  const legacyFiles = [
    "src/lib/account-store.ts",
    "src/lib/wishlist-store.ts",
    "src/lib/reviews-store.ts",
    "data/account-store.json",
  ];

  const presence = await Promise.all(
    legacyFiles.map(async (file) => ({
      file,
      present: await exists(file),
    })),
  );

  let jsonSummary = "Unable to read account-store.json";
  try {
    const raw = JSON.parse(
      await readFile(
        path.join(process.cwd(), "data", "account-store.json"),
        "utf8",
      ),
    ) as {
      ordersByProfile?: Record<string, unknown[]>;
      stripeProcessedEvents?: string[];
    };

    const profiles = Object.keys(raw.ordersByProfile ?? {});
    const orderCount = Object.values(raw.ordersByProfile ?? {}).reduce(
      (sum, orders) => sum + orders.length,
      0,
    );

    jsonSummary =
      `Profiles with JSON orders: ${profiles.length}\n` +
      `JSON orders: ${orderCount}\n` +
      `Stripe processed event IDs: ${(raw.stripeProcessedEvents ?? []).length}`;
  } catch {
    // Report inability without mutating data.
  }

  const lines = [
    "# Section 6.1 - Remaining Account Data Audit",
    "",
    "Generated from the local project before Section 6.2 order migration.",
    "",
    "## Storage map",
    "",
    "| Area | Current storage | PostgreSQL target | Planned section |",
    "| --- | --- | --- | --- |",
    ...items.map(
      (item) =>
        `| ${item.area} | ${item.currentStorage} | ${item.databaseModel} | ${item.section} |`,
    ),
    "",
    "## Notes",
    "",
    ...items.map(
      (item) =>
        `### ${item.area}\n\nSource: \`${item.source}\`\n\n${item.notes}\n`,
    ),
    "## Legacy file presence",
    "",
    ...presence.map(
      (entry) =>
        `- ${entry.present ? "PRESENT" : "ABSENT"}: \`${entry.file}\``,
    ),
    "",
    "## Current JSON compatibility data",
    "",
    "```text",
    jsonSummary,
    "```",
    "",
    "## Section 6.2 decision",
    "",
    "Orders move first because the Prisma schema already contains `Order` and `OrderItem`. PostgreSQL becomes the primary runtime order source while JSON remains temporarily available as a fallback and mirror. Stripe event IDs remain untouched until Section 6.3.",
    "",
  ];

  const docsDir = path.join(process.cwd(), "docs");
  await mkdir(docsDir, { recursive: true });
  await writeFile(
    path.join(docsDir, "SECTION-6-1-DATA-AUDIT.md"),
    lines.join("\n"),
    "utf8",
  );

  console.log("");
  console.log("SECTION 6.1 remaining-data audit");
  console.log("");
  console.log(jsonSummary);
  console.log("");
  for (const item of items) {
    console.log(`${item.area}: ${item.currentStorage} -> ${item.databaseModel} (${item.section})`);
  }
  console.log("");
  console.log("Audit written to docs/SECTION-6-1-DATA-AUDIT.md");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});