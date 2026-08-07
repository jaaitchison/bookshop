import "dotenv/config";
import { access, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { getPrismaClient } from "../src/lib/prisma";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

async function exists(relativePath: string): Promise<boolean> {
  try {
    await access(path.join(process.cwd(), relativePath));
    return true;
  } catch {
    return false;
  }
}

async function collectSourceFiles(
  relativeRoot: string,
): Promise<string[]> {
  const root = path.join(process.cwd(), relativeRoot);
  const entries = await readdir(root, {
    withFileTypes: true,
  });

  const files: string[] = [];

  for (const entry of entries) {
    const absolute = path.join(root, entry.name);
    const relative = path.relative(process.cwd(), absolute);

    if (entry.isDirectory()) {
      files.push(...(await collectSourceFiles(relative)));
    } else if (
      entry.name.endsWith(".ts") ||
      entry.name.endsWith(".tsx")
    ) {
      files.push(absolute);
    }
  }

  return files;
}

async function main() {
  const prisma = getPrismaClient();
  assert(prisma, "Prisma client unavailable.");

  console.log("");
  console.log("SECTION 6.10 account-data migration close-out");
  console.log("");

  console.log("1. PostgreSQL connection and models");

  const [
    users,
    roles,
    sessions,
    orders,
    orderItems,
    wishlistItems,
    reviews,
    readingProgress,
    stripeEvents,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.role.count(),
    prisma.authSession.count(),
    prisma.order.count(),
    prisma.orderItem.count(),
    prisma.wishlistItem.count(),
    prisma.review.count(),
    prisma.readingProgress.count(),
    prisma.stripeWebhookEvent.count(),
  ]);

  console.log(`   User: ${users}`);
  console.log(`   Role: ${roles}`);
  console.log(`   AuthSession: ${sessions}`);
  console.log(`   Order: ${orders}`);
  console.log(`   OrderItem: ${orderItems}`);
  console.log(`   WishlistItem: ${wishlistItems}`);
  console.log(`   Review: ${reviews}`);
  console.log(`   ReadingProgress: ${readingProgress}`);
  console.log(`   StripeWebhookEvent: ${stripeEvents}`);
  console.log("   PASS - all account-data models are queryable.");

  console.log("");
  console.log("2. Required repositories and APIs");

  const requiredFiles = [
    "src/lib/account-profile-repository.ts",
    "src/lib/order-repository.ts",
    "src/lib/stripe-event-repository.ts",
    "src/lib/wishlist-repository.ts",
    "src/lib/review-repository.ts",
    "src/lib/reading-progress-repository.ts",
    "app/api/account/profile/route.ts",
    "app/api/wishlist/route.ts",
    "app/api/books/[id]/reviews/route.ts",
    "app/api/reading-progress/route.ts",
  ];

  for (const requiredFile of requiredFiles) {
    assert(
      await exists(requiredFile),
      `Required Phase 6 file is missing: ${requiredFile}`,
    );
  }

  console.log(
    "   PASS - all PostgreSQL repositories and authenticated APIs exist.",
  );

  console.log("");
  console.log("3. Removed prototype stores");

  const forbiddenFiles = [
    "data/account-store.json",
    "data/wishlist.json",
    "data/reviews.json",
    "src/lib/account-store.ts",
    "src/lib/wishlist-store.ts",
    "src/lib/reviews-store.ts",
    "src/lib/auth-session.ts",
  ];

  for (const forbiddenFile of forbiddenFiles) {
    assert(
      !(await exists(forbiddenFile)),
      `Removed prototype file still exists: ${forbiddenFile}`,
    );
  }

  console.log(
    "   PASS - obsolete account JSON and legacy-auth stores are absent.",
  );

  console.log("");
  console.log("4. Runtime source scan");

  const sourceFiles = [
    ...(await collectSourceFiles("app")),
    ...(await collectSourceFiles("src")),
  ];

  const forbiddenMarkers = [
    "bookshop-account-orders-",
    "bookshop-reading-progress-",
    "getOrdersStorageKey",
    "reviews-store",
    "wishlist-store",
    "account-store",
    "PROFILE_STORAGE_KEY",
    "SESSION_STORAGE_KEY",
  ];

  const violations: string[] = [];

  for (const sourceFile of sourceFiles) {
    const source = await readFile(sourceFile, "utf8");

    for (const marker of forbiddenMarkers) {
      if (source.includes(marker)) {
        violations.push(
          `${path.relative(process.cwd(), sourceFile)} contains ${marker}`,
        );
      }
    }
  }

  assert(
    violations.length === 0,
    `Legacy account-data runtime markers remain:\n${violations.join("\n")}`,
  );

  console.log(
    "   PASS - runtime source contains no obsolete account-data markers.",
  );

  console.log("");
  console.log("5. Archive isolation");

  if (await exists("data/archive")) {
    for (const sourceFile of sourceFiles) {
      const source = await readFile(sourceFile, "utf8");

      assert(
        !source.includes("data/archive"),
        `${path.relative(
          process.cwd(),
          sourceFile,
        )} reads historical archive data at runtime.`,
      );
    }
  }

  console.log(
    "   PASS - historical archive files are not runtime dependencies.",
  );

  console.log("");
  console.log("6. Documentation");

  assert(
    await exists("docs/ACCOUNT-DATA-ARCHITECTURE.md"),
    "Account-data architecture documentation is missing.",
  );

  console.log(
    "   PASS - final account-data architecture is documented.",
  );

  console.log("");
  console.log("SECTION 6.10 PASSED.");
  console.log(
    "PostgreSQL is the sole runtime authority for account-owned data.",
  );
}

main()
  .catch((error) => {
    console.error("");
    console.error("SECTION 6.10 FAILED.");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    const prisma = getPrismaClient();

    if (prisma) {
      await prisma.$disconnect();
    }
  });