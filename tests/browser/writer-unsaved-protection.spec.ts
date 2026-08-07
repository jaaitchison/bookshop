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
      // try next file
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

test("Section 8.3 protects dirty chapter switching", async ({ page }) => {
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
      slug: `section-8-3-${Date.now()}`,
      title: "Section 8.3 Unsaved Test",
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
        create: [
          {
            title: "Chapter One",
            content: "Saved one",
            chapterNo: 1,
            isPreview: false,
          },
          {
            title: "Chapter Two",
            content: "Saved two",
            chapterNo: 2,
            isPreview: false,
          },
        ],
      },
    },
    include: {
      chapters: {
        orderBy: {
          chapterNo: "asc",
        },
      },
    },
  });

  try {
    await signIn(page);
    await page.goto(`/studio/books/${book.id}`);

    await expect(
      page.getByRole("heading", { name: "Chapter 1" }),
    ).toBeVisible();

    await page
      .getByLabel("Chapter content")
      .fill("Unsaved local edit");

    await expect(
      page.getByTestId("chapter-save-state"),
    ).toContainText("Unsaved changes");

    page.once("dialog", async (dialog) => {
      expect(dialog.message()).toContain(
        "Switch chapters and discard those changes?",
      );
      await dialog.dismiss();
    });

    await page
      .locator("section")
      .filter({ hasText: "Chapters" })
      .getByText("Chapter Two", { exact: true })
      .click();

    await expect(
      page.getByRole("heading", { name: "Chapter 1" }),
    ).toBeVisible();

    page.once("dialog", async (dialog) => {
      await dialog.accept();
    });

    await page
      .locator("section")
      .filter({ hasText: "Chapters" })
      .getByText("Chapter Two", { exact: true })
      .click();

    await expect(
      page.getByRole("heading", { name: "Chapter 2" }),
    ).toBeVisible();
  } finally {
    await prisma.book.delete({
      where: {
        id: book.id,
      },
    });

    await prisma.$disconnect();
  }
});