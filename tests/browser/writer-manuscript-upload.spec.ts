import "dotenv/config";
import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import path from "node:path";
import { getBookFileStorage } from "../../src/lib/book-file-storage";
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
  await page.getByLabel("Email").fill("writer@bookshop.local");
  await page.getByLabel("Password").fill(DEV_PASSWORD!);
  await page.getByRole("button", { name: "Continue to account" }).click();
  await expect(page).toHaveURL(/\/account(?:\?|$)/);
}

const PDF = Buffer.from("%PDF-1.4\n1 0 obj\n<<>>\nendobj\n%%EOF", "latin1");
const EPUB = Buffer.from("PK\x03\x04mimetypeapplication/epub+zip browser sample", "latin1");

test("Section 9.4 manages private manuscript and sample files", async ({ page }) => {
  const prisma = getPrismaClient();
  if (!prisma) throw new Error("Prisma client unavailable.");
  const writer = await prisma.user.findUnique({ where: { email: "writer@bookshop.local" } });
  if (!writer) throw new Error("Writer development user is missing.");

  const book = await prisma.book.create({
    data: {
      slug: `section-9-4-browser-${Date.now()}`,
      title: "Section 9.4 Browser File Test",
      authorId: writer.id,
      authorDisplayName: writer.name,
      status: "DRAFT",
    },
  });

  try {
    await signIn(page);
    await page.goto(`/studio/books/${book.id}`);

    await page.getByLabel("Upload manuscript").setInputFiles({
      name: "complete-manuscript.pdf",
      mimeType: "application/pdf",
      buffer: PDF,
    });
    await expect(page.getByText(/complete-manuscript\.pdf · PDF/)).toBeVisible();
    const manuscript = await prisma.bookFile.findUnique({
      where: { bookId_fileType: { bookId: book.id, fileType: "MANUSCRIPT" } },
    });
    expect(manuscript?.isPublic).toBe(false);
    expect(manuscript?.storageKey).toMatch(new RegExp(`^${book.id}/[0-9a-f-]+\\.pdf$`));

    await page.getByLabel("Upload sample").setInputFiles({
      name: "forged.epub",
      mimeType: "application/epub+zip",
      buffer: Buffer.from("not an epub"),
    });
    await expect(page.getByRole("alert").filter({ hasText: "contents do not match" })).toBeVisible();

    await page.getByLabel("Upload sample").setInputFiles({
      name: "reader-sample.epub",
      mimeType: "application/epub+zip",
      buffer: EPUB,
    });
    await expect(page.getByText(/reader-sample\.epub · EPUB/)).toBeVisible();
    const sample = await prisma.bookFile.findUnique({
      where: { bookId_fileType: { bookId: book.id, fileType: "SAMPLE" } },
    });
    expect(sample?.isPublic).toBe(true);

    await page.getByRole("button", { name: "Remove manuscript" }).click();
    await expect(page.getByText("No manuscript uploaded.")).toBeVisible();
    await page.getByRole("button", { name: "Remove sample" }).click();
    await expect(page.getByText("No sample uploaded.")).toBeVisible();
    await expect.poll(() => prisma.bookFile.count({ where: { bookId: book.id } })).toBe(0);
  } finally {
    const remaining = await prisma.bookFile.findMany({ where: { bookId: book.id }, select: { storageKey: true } });
    await Promise.all(remaining.map(({ storageKey }) => getBookFileStorage().remove(storageKey).catch(() => undefined)));
    await prisma.book.delete({ where: { id: book.id } }).catch(() => undefined);
    await prisma.$disconnect();
  }
});
