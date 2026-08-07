import "dotenv/config";
import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import path from "node:path";
import { getPrismaClient } from "../../src/lib/prisma";

function readEnvValue(name: string): string | undefined {
  if (process.env[name]) {
    return process.env[name];
  }

  for (const filename of [".env.local", ".env"]) {
    try {
      const source = readFileSync(
        path.join(process.cwd(), filename),
        "utf8",
      );

      for (const line of source.split(/\r?\n/)) {
        const trimmed = line.trim();

        if (!trimmed || trimmed.startsWith("#")) continue;

        const separator = trimmed.indexOf("=");
        if (separator === -1) continue;

        if (trimmed.slice(0, separator).trim() === name) {
          return trimmed.slice(separator + 1).trim();
        }
      }
    } catch {
      // try next env file
    }
  }

  return undefined;
}

const DEV_PASSWORD = readEnvValue("DEV_TEST_USER_PASSWORD");

if (!DEV_PASSWORD) {
  throw new Error("DEV_TEST_USER_PASSWORD is missing.");
}

async function signIn(page: Page) {
  await page.context().clearCookies();
  await page.goto("/auth");
  await page.getByLabel("Email").fill("writer@bookshop.local");
  await page.getByLabel("Password").fill(DEV_PASSWORD!);
  await page
    .getByRole("button", { name: "Continue to account" })
    .click();
  await expect(page).toHaveURL(/\/account(?:\?|$)/);
}

test("Section 8.7 stores Markdown source and previews it safely", async ({ page }) => {
  const prisma = getPrismaClient();

  if (!prisma) {
    throw new Error("Prisma client unavailable.");
  }

  const writer = await prisma.user.findUnique({
    where: {
      email: "writer@bookshop.local",
    },
  });

  if (!writer) {
    throw new Error("Writer development user is missing.");
  }

  const book = await prisma.book.create({
    data: {
      slug: `section-8-7-${Date.now()}`,
      title: "Section 8.7 Markdown Test",
      authorId: writer.id,
      authorDisplayName: writer.name,
      description: "",
      genre: "Fiction",
      coverUrl: "",
      price: 0,
      ratingAverage: 0,
      reviewCount: 0,
      featured: false,
      newRelease: false,
      status: "DRAFT",
      chapters: {
        create: {
          title: "Markdown Chapter",
          content: "",
          chapterNo: 1,
          isPreview: false,
        },
      },
    },
    include: {
      chapters: true,
    },
  });

  try {
    await signIn(page);
    await page.goto(`/studio/books/${book.id}`);

    const autosaveResponse = page.waitForResponse(
      (response) =>
        response.url().includes("/api/studio/books/") &&
        response.url().includes("/chapters/") &&
        response.request().method() === "PUT",
    );

    const content = page.getByLabel("Chapter content");

    await content.fill(
      "# My heading\n\n- First item\n\n> A quote",
    );

    await page
      .getByRole("button", { name: "Show preview" })
      .click();

    const preview = page.getByTestId("markdown-preview");

    await expect(preview).toContainText("My heading");
    await expect(preview).toContainText("First item");
    await expect(preview).toContainText("A quote");

    const response = await autosaveResponse;
    expect(response.status()).toBe(200);

    const persisted = await prisma.chapter.findUnique({
      where: {
        id: book.chapters[0].id,
      },
    });

    expect(persisted?.content).toBe(
      "# My heading\n\n- First item\n\n> A quote",
    );
  } finally {
    await prisma.book.delete({
      where: {
        id: book.id,
      },
    });

    await prisma.$disconnect();
  }
});