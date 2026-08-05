import "dotenv/config";
import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import path from "node:path";
import { getPrismaClient } from "../../src/lib/prisma";
import { getCoverStorage } from "../../src/lib/cover-storage";

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
  await page.getByLabel("Email").fill("writer@bookshop.local");
  await page.getByLabel("Password").fill(DEV_PASSWORD!);
  await page.getByRole("button", { name: "Continue to account" }).click();
  await expect(page).toHaveURL(/\/account(?:\?|$)/);
}

const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64");

test("Section 8.8 uploads, replaces, validates and removes a cover", async ({ page }) => {
  const prisma = getPrismaClient();
  if (!prisma) throw new Error("Prisma client unavailable.");
  const writer = await prisma.user.findUnique({ where: { email: "writer@bookshop.local" } });
  if (!writer) throw new Error("Writer development user is missing.");

  const book = await prisma.book.create({
    data: {
      slug: `section-8-8-${Date.now()}`,
      title: "Section 8.8 Cover Test",
      authorId: writer.id,
      authorDisplayName: writer.name,
      genre: "Fiction",
      price: 0,
      status: "DRAFT",
    },
  });

  try {
    await signIn(page);
    await page.goto(`/studio/books/${book.id}`);

    await page.getByLabel("Upload cover").setInputFiles({ name: "cover.png", mimeType: "image/png", buffer: PNG });
    await expect(page.getByAltText(`Cover preview for ${book.title}`)).toBeVisible();
    const first = await prisma.book.findUnique({ where: { id: book.id } });
    expect(first?.coverUrl).toMatch(/^\/uploads\/covers\/[0-9a-f-]+\.png$/);

    await page.getByLabel("Replace cover").setInputFiles({ name: "replacement.png", mimeType: "image/png", buffer: PNG });
    await expect.poll(async () => (await prisma.book.findUnique({ where: { id: book.id } }))?.coverUrl).not.toBe(first?.coverUrl);

    await page.getByLabel("Replace cover").setInputFiles({ name: "fake.png", mimeType: "image/png", buffer: Buffer.from("not an image") });
    await expect(
      page.getByRole("alert").filter({ hasText: "file contents do not match" }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Remove cover" }).click();
    await expect(page.getByText("No cover uploaded")).toBeVisible();
    await expect.poll(async () => (await prisma.book.findUnique({ where: { id: book.id } }))?.coverUrl).toBe("");
  } finally {
    const current = await prisma.book.findUnique({ where: { id: book.id } });
    if (current?.coverUrl) await getCoverStorage().remove(current.coverUrl);
    await prisma.book.delete({ where: { id: book.id } });
    await prisma.$disconnect();
  }
});
