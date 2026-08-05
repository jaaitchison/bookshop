import "dotenv/config";
import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import path from "node:path";
import { getPrismaClient } from "../../src/lib/prisma";
import { createManagedChapter } from "../../src/lib/writer-chapter-repository";
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
  await page.goto("/auth");
  await page.getByLabel("Email").fill("writer@bookshop.local");
  await page.getByLabel("Password").fill(DEV_PASSWORD!);
  await page.getByRole("button", { name: "Continue to account" }).click();
  await expect(page).toHaveURL(/\/account(?:\?|$)/);
}

test("Section 8.11 rejects a stale chapter save and preserves the newer revision", async ({ context, page: pageA }) => {
  const prisma = getPrismaClient();
  if (!prisma) throw new Error("Prisma client unavailable.");
  const writer = await prisma.user.findUnique({ where: { email: "writer@bookshop.local" } });
  if (!writer) throw new Error("Writer development user is missing.");

  const book = await createWriterOwnedDraft({
    userId: writer.id,
    title: "Section 8.11 Concurrency Test",
    slug: `section-8-11-${Date.now()}`,
  });
  const chapter = await createManagedChapter(writer.id, book.id, {
    title: "Shared chapter",
    content: "Initial shared content",
  });
  if (!chapter) throw new Error("Test chapter creation failed.");

  const pageB = await context.newPage();

  try {
    await signIn(pageA);
    await Promise.all([
      pageA.goto(`/studio/books/${book.id}`),
      pageB.goto(`/studio/books/${book.id}`),
    ]);
    await expect(pageA.getByLabel("Chapter content")).toHaveValue("Initial shared content");
    await expect(pageB.getByLabel("Chapter content")).toHaveValue("Initial shared content");

    const firstSave = pageA.waitForResponse(
      (response) => response.url().endsWith(`/chapters/${chapter.id}`) && response.request().method() === "PUT",
    );
    await pageA.getByLabel("Chapter content").fill("Newer content from session A");
    expect((await firstSave).status()).toBe(200);
    await expect(pageA.getByTestId("chapter-save-state")).toContainText("Saved");

    const staleSave = pageB.waitForResponse(
      (response) => response.url().endsWith(`/chapters/${chapter.id}`) && response.request().method() === "PUT",
    );
    await pageB.getByLabel("Chapter content").fill("Stale content from session B");
    expect((await staleSave).status()).toBe(409);
    await expect(pageB.getByTestId("chapter-conflict")).toBeVisible();

    const persisted = await prisma.chapter.findUnique({ where: { id: chapter.id } });
    expect(persisted?.content).toBe("Newer content from session A");
    expect(persisted?.version).toBe(2);
    expect(await prisma.chapterRevision.count({ where: { chapterId: chapter.id } })).toBe(2);

    pageB.once("dialog", async (dialog) => dialog.accept());
    await pageB.getByRole("button", { name: "Reload latest version" }).click();
    await expect(pageB.getByLabel("Chapter content")).toHaveValue("Newer content from session A");
    await expect(pageB.getByTestId("chapter-save-state")).toContainText("Saved");
    await expect(pageB.getByTestId("chapter-conflict")).toHaveCount(0);
  } finally {
    await pageB.close();
    await prisma.book.delete({ where: { id: book.id } });
    await prisma.$disconnect();
  }
});
