import "dotenv/config";
import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import path from "node:path";
import { getPrismaClient } from "../../src/lib/prisma";

function envValue(name: string) {
  if (process.env[name]) return process.env[name];
  for (const filename of [".env.local", ".env"]) {
    try {
      for (const line of readFileSync(path.join(process.cwd(), filename), "utf8").split(/\r?\n/)) {
        const [key, ...value] = line.split("=");
        if (key?.trim() === name) return value.join("=").trim();
      }
    } catch { /* try next file */ }
  }
}

const DEV_PASSWORD = envValue("DEV_TEST_USER_PASSWORD");
if (!DEV_PASSWORD) throw new Error("DEV_TEST_USER_PASSWORD is missing.");

async function signIn(page: Page) {
  await page.context().clearCookies();
  await page.goto("/auth");
  await page.getByLabel("Email").fill("reader@bookshop.local");
  await page.getByLabel("Password").fill(DEV_PASSWORD!);
  await page.getByRole("button", { name: "Continue to account" }).click();
  await expect(page).toHaveURL(/\/account(?:\?|$)/);
}

test("Section 9.5 exposes only public catalogue books and renders live library grants", async ({ page }) => {
  const prisma = getPrismaClient();
  if (!prisma) throw new Error("Prisma client unavailable.");
  const reader = await prisma.user.findUnique({ where: { email: "reader@bookshop.local" } });
  if (!reader) throw new Error("Reader development user is missing.");

  const suffix = Date.now();
  const publicBook = await prisma.book.create({
    data: {
      slug: `section-9-5-browser-public-${suffix}`,
      title: `Live Database Catalogue ${suffix}`,
      authorDisplayName: "Database Author",
      genre: "Browser Database Genre",
      status: "PUBLISHED",
      visibility: "PUBLIC",
    },
  });
  const privateBook = await prisma.book.create({
    data: {
      slug: `section-9-5-browser-private-${suffix}`,
      title: `Private Library Grant ${suffix}`,
      authorDisplayName: "Private Author",
      status: "PUBLISHED",
      visibility: "PRIVATE",
      libraryItems: { create: { userId: reader.id } },
    },
  });

  try {
    await page.goto("/books");
    await page.getByPlaceholder("Title or author...").fill(publicBook.title);
    await expect(page.getByRole("heading", { name: publicBook.title })).toBeVisible();
    await expect(page.getByText(privateBook.title)).toHaveCount(0);

    await page.goto(`/books/${privateBook.slug}`);
    await expect(page.getByText("Book not found.")).toBeVisible();

    await signIn(page);
    await page.goto("/library");
    await expect(page.getByRole("heading", { name: privateBook.title })).toBeVisible();
    await expect(page.getByText("1 database-backed library item")).toBeVisible();
  } finally {
    await prisma.book.deleteMany({ where: { id: { in: [publicBook.id, privateBook.id] } } });
    await prisma.$disconnect();
  }
});
