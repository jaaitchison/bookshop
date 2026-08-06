import "dotenv/config";
import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import path from "node:path";
import { getPrismaClient } from "../../src/lib/prisma";

function env(name: string) {
  if (process.env[name]) return process.env[name];
  for (const filename of [".env.local", ".env"]) {
    try {
      const line = readFileSync(path.join(process.cwd(), filename), "utf8").split(/\r?\n/).find((entry) => entry.trim().startsWith(`${name}=`));
      if (line) return line.slice(line.indexOf("=") + 1).trim();
    } catch { /* try the next file */ }
  }
}

const PASSWORD = env("DEV_TEST_USER_PASSWORD");
if (!PASSWORD) throw new Error("DEV_TEST_USER_PASSWORD is missing.");

async function signIn(page: Page, email: string) {
  await page.context().clearCookies();
  await page.goto("/auth");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(PASSWORD!);
  await page.getByRole("button", { name: "Continue to account" }).click();
  await expect(page).toHaveURL(/\/account/);
}

test("Writer receives Admin feedback, resubmits and is published", async ({ page }) => {
  const prisma = getPrismaClient();
  if (!prisma) throw new Error("Prisma client unavailable.");
  const writer = await prisma.user.findUniqueOrThrow({ where: { email: "writer@bookshop.local" } });
  const title = `Moderation Browser ${Date.now()}`;
  const book = await prisma.book.create({
    data: {
      slug: `moderation-browser-${Date.now()}`,
      title,
      authorId: writer.id,
      authorDisplayName: writer.name,
      description: "A browser-tested publishing submission.",
      genre: "Literary Fiction",
      price: 7.99,
      status: "DRAFT",
      visibility: "PRIVATE",
    },
  });

  try {
    await signIn(page, "writer@bookshop.local");
    await page.goto("/studio");
    const writerRow = page.getByRole("row").filter({ hasText: title });
    await writerRow.getByRole("button", { name: "Submit for review" }).click();
    await expect(writerRow).toContainText("In review");

    await signIn(page, "admin@bookshop.local");
    await page.goto("/admin");
    const reviewCard = page.locator("article").filter({ hasText: title });
    await expect(reviewCard).toBeVisible();
    const feedback = "Please add a clearer closing paragraph before publication.";
    await reviewCard.getByLabel("Feedback to Writer").fill(feedback);
    await reviewCard.getByRole("button", { name: "Request changes" }).click();
    await expect(page.getByText("The Writer can now see the requested changes.")).toBeVisible();

    await signIn(page, "writer@bookshop.local");
    await page.goto("/studio");
    const changedRow = page.getByRole("row").filter({ hasText: title });
    await expect(changedRow).toContainText("Changes requested");
    await expect(changedRow).toContainText(feedback);
    await changedRow.getByRole("button", { name: "Submit for review" }).click();
    await expect(changedRow).toContainText("In review");

    await signIn(page, "admin@bookshop.local");
    await page.goto("/admin");
    const resubmission = page.locator("article").filter({ hasText: title });
    await resubmission.getByRole("button", { name: "Approve & publish" }).click();
    await expect(page.getByText("The book is now published in the public catalogue.")).toBeVisible();

    const published = await prisma.book.findUniqueOrThrow({ where: { id: book.id } });
    const audit = await prisma.publishingAuditLog.findMany({ where: { bookId: book.id } });
    expect(published.status).toBe("PUBLISHED");
    expect(published.visibility).toBe("PUBLIC");
    expect(audit.map((entry) => entry.action)).toEqual([
      "SUBMITTED_FOR_REVIEW",
      "CHANGES_REQUESTED",
      "SUBMITTED_FOR_REVIEW",
      "PUBLISHED",
    ]);
  } finally {
    await prisma.book.delete({ where: { id: book.id } }).catch(() => undefined);
    await prisma.$disconnect();
  }
});
