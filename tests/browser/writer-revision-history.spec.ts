import "dotenv/config";
import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import path from "node:path";
import { getPrismaClient } from "../../src/lib/prisma";
import { createManagedChapter, updateManagedChapter } from "../../src/lib/writer-chapter-repository";
import { createWriterOwnedDraft } from "../../src/lib/writer-book-repository";

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

test("Section 8.10 inspects and restores a revision without deleting history", async ({ page }) => {
  const prisma = getPrismaClient();
  if (!prisma) throw new Error("Prisma client unavailable.");
  const writer = await prisma.user.findUnique({ where: { email: "writer@bookshop.local" } });
  if (!writer) throw new Error("Writer development user is missing.");

  const book = await createWriterOwnedDraft({
    userId: writer.id,
    title: "Section 8.10 History Test",
    slug: `section-8-10-${Date.now()}`,
  });
  const chapter = await createManagedChapter(writer.id, book.id, {
    title: "Original revision",
    content: "Original revision content",
    isPreview: false,
  });
  if (!chapter) throw new Error("Test chapter creation failed.");
  await updateManagedChapter(writer.id, book.id, chapter.id, {
    title: "Current revision",
    content: "Current revision content",
    isPreview: true,
  });

  try {
    await signIn(page);
    await page.goto(`/studio/books/${book.id}`);
    await page.getByRole("button", { name: "Show revision history" }).click();
    await expect(page.getByTestId("revision-history")).toBeVisible();

    await page.getByRole("button", { name: "Inspect revision: Original revision" }).click();
    const comparison = page.getByTestId("revision-comparison");
    await expect(comparison).toContainText("Original revision content");
    await expect(comparison).toContainText("Current revision content");

    await page.getByLabel("Chapter title").fill("Unsaved title");
    page.once("dialog", async (dialog) => dialog.accept());
    const restoreResponse = page.waitForResponse(
      (response) => response.url().endsWith(`/chapters/${chapter.id}/revisions`) && response.request().method() === "POST",
    );
    await page.getByRole("button", { name: "Restore this revision" }).click();
    expect((await restoreResponse).status()).toBe(200);

    await expect(page.getByLabel("Chapter title")).toHaveValue("Original revision");
    await expect(page.getByLabel("Chapter content")).toHaveValue("Original revision content");
    await expect(page.getByTestId("chapter-save-state")).toContainText("Saved");

    expect(await prisma.chapterRevision.count({ where: { chapterId: chapter.id } })).toBe(3);
    expect(
      await prisma.chapterRevision.count({
        where: { chapterId: chapter.id, content: "Original revision content" },
      }),
    ).toBe(2);
  } finally {
    await prisma.book.delete({ where: { id: book.id } });
    await prisma.$disconnect();
  }
});
