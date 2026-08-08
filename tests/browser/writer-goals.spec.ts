import "dotenv/config";
import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import path from "node:path";
import { getPrismaClient } from "../../src/lib/prisma";

function envValue(name: string) {
  if (process.env[name]) return process.env[name];
  for (const filename of [".env.local", ".env"]) {
    try {
      for (const line of readFileSync(path.join(process.cwd(), filename), "utf8").split(/\r?\n/u)) {
        const [key, ...rest] = line.split("=");
        if (key?.trim() === name) return rest.join("=").trim();
      }
    } catch { /* try next file */ }
  }
  return undefined;
}

const password = envValue("DEV_TEST_USER_PASSWORD");
if (!password) throw new Error("DEV_TEST_USER_PASSWORD is required.");

test("Writer sets, views and removes a live manuscript goal", async ({ page }) => {
  const prisma = getPrismaClient();
  if (!prisma) throw new Error("Prisma client unavailable.");
  const writer = await prisma.user.findUnique({ where: { email: "writer@bookshop.local" } });
  if (!writer) throw new Error("Development Writer is required.");
  const suffix = Date.now().toString(36);
  const book = await prisma.book.create({
    data: {
      slug: `browser-writing-goal-${suffix}`,
      title: `Browser Writing Goal ${suffix}`,
      authorId: writer.id,
      authorDisplayName: writer.name,
      chapters: { create: { title: "Opening", content: "one two three four five", chapterNo: 1 } },
    },
  });

  try {
    await page.goto("/auth");
    await page.getByLabel("Email").fill("writer@bookshop.local");
    await page.getByLabel("Password").fill(password);
    const signinResponsePromise = page.waitForResponse(
      (response) => response.url().includes("/api/auth/signin") && response.request().method() === "POST",
    );
    await page.getByRole("button", { name: "Continue to account" }).click();
    const signinResponse = await signinResponsePromise;
    expect(signinResponse.status()).toBe(200);
    await expect(page).toHaveURL(/\/account(?:\?|$)/u);
    await page.goto("/studio");

    const card = page.getByTestId(`writing-goal-${book.id}`);
    await expect(card).toBeVisible();
    await card.getByLabel(`Word target for ${book.title}`).fill("60000");
    const deadline = new Date(Date.now() + 45 * 86_400_000).toISOString().slice(0, 10);
    await card.getByLabel(`Deadline for ${book.title}`).fill(deadline);
    await card.getByRole("button", { name: `Save goal for ${book.title}` }).click();

    await expect(card).toContainText("5 words written");
    await expect(card).toContainText("words per day needed");
    await card.getByRole("button", { name: "Remove goal" }).click();
    await expect(card).toContainText("Goal not set");
  } finally {
    await prisma.book.deleteMany({ where: { id: book.id } });
  }
});
