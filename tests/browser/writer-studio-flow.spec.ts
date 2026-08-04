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

        if (!trimmed || trimmed.startsWith("#")) {
          continue;
        }

        const separator = trimmed.indexOf("=");

        if (separator === -1) {
          continue;
        }

        const key = trimmed.slice(0, separator).trim();

        if (key === name) {
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
  throw new Error(
    "DEV_TEST_USER_PASSWORD is missing. Run the development-user setup first.",
  );
}

async function clearAuth(page: Page) {
  await page.context().clearCookies();
  await page.goto("/");
}

async function signIn(page: Page, email: string) {
  await clearAuth(page);
  await page.goto("/auth");

  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(DEV_PASSWORD!);
  await page
    .getByRole("button", { name: "Continue to account" })
    .click();

  await expect(page).toHaveURL(/\/account(?:\?|$)/);
}

test.describe("Section 7.9 Writer Studio real browser workflow", () => {
  test.describe.configure({ mode: "serial" });

  const createdTitle = `Browser Writer Test ${Date.now()}`;
  const updatedTitle = `${createdTitle} Revised`;

  test("Reader cannot access Writer Studio", async ({ page }) => {
    await signIn(page, "reader@bookshop.local");
    await page.goto("/studio");

    await expect(page).toHaveURL(
      /\/account\?denied=writer(?:&|$)/,
    );
  });

  test("Writer creates a Draft through the real Studio UI", async ({ page }) => {
    await signIn(page, "writer@bookshop.local");
    await page.goto("/studio");

    await page.getByRole("link", { name: "Write book" }).click();
    await expect(page).toHaveURL(/\/studio\/new$/);

    await page.getByLabel("Title").fill(createdTitle);
    await page.getByLabel("Genre").fill("Fantasy");
    await page.getByLabel("Description").fill(
      "Created through the real Section 7.9 browser workflow.",
    );
    await page.getByLabel(/Price/).fill("4.99");

    await page
      .getByRole("button", { name: "Create Draft" })
      .click();

    await expect(page).toHaveURL(/\/studio\/books\/[^/]+$/);

    await expect(
      page.getByText("Status:").locator(".."),
    ).toContainText("draft");
  });

  test("Writer edits metadata and manages chapters in the real editor", async ({ page }) => {
    await signIn(page, "writer@bookshop.local");
    await page.goto("/studio");

    const row = page
      .getByRole("row")
      .filter({ hasText: createdTitle });

    await expect(row).toBeVisible();
    await row.getByRole("link", { name: "Edit" }).click();

    await page.getByLabel("Title").fill(updatedTitle);
    await page.getByLabel("Genre").fill("Mystery");
    await page.getByLabel("Description").fill(
      "Updated through the browser editor.",
    );
    await page.getByLabel(/Price/).fill("5.49");

    await page
      .getByRole("button", { name: "Save book details" })
      .click();

    await expect(
      page.getByRole("heading", { name: updatedTitle }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Add" }).click();

    await expect(
      page.getByRole("heading", { name: "Chapter 1" }),
    ).toBeVisible();

    await expect(
      page.getByLabel("Chapter title"),
    ).toHaveValue("Chapter 1");

    await page.getByLabel("Chapter title").fill("Opening Chapter");
    await page.getByLabel("Chapter content").fill(
      "Opening content from the real browser test.",
    );

    await page
      .getByLabel("Allow this chapter as a public preview")
      .check();

    await page
      .getByRole("button", { name: "Save chapter" })
      .click();

    await page.getByRole("button", { name: "Add" }).click();

    await expect(
      page.getByRole("heading", { name: "Chapter 2" }),
    ).toBeVisible();

    const secondChapterTitle =
      page.getByLabel("Chapter title");

    await expect(secondChapterTitle).toHaveValue("Chapter 2");

    await secondChapterTitle.fill("Second Chapter");

    await expect(secondChapterTitle).toHaveValue(
      "Second Chapter",
    );

    await page.getByLabel("Chapter content").fill(
      "Second chapter content.",
    );

    const secondChapterSave = page.waitForResponse(
      (response) =>
        response.url().includes("/api/studio/books/") &&
        response.url().includes("/chapters/") &&
        response.request().method() === "PUT",
    );

    await page
      .getByRole("button", { name: "Save chapter" })
      .click();

    const secondChapterSaveResponse =
      await secondChapterSave;

    expect(secondChapterSaveResponse.status()).toBe(200);

    const chapterCards = page
      .locator("section")
      .filter({ hasText: "Chapters" })
      .locator("div.rounded-2xl.border");

    await expect(chapterCards).toHaveCount(2);

    const secondChapterCard = chapterCards
      .filter({ hasText: "Second Chapter" });

    await expect(secondChapterCard).toHaveCount(1);

    const reorderResponse = page.waitForResponse(
      (response) =>
        response.url().includes("/api/studio/books/") &&
        response.url().endsWith("/chapters") &&
        response.request().method() === "PATCH",
    );

    await secondChapterCard
      .getByRole("button", { name: "Up" })
      .click();

    const reordered = await reorderResponse;
    expect(reordered.status()).toBe(200);

    await expect(
      chapterCards.nth(0),
    ).toContainText("Second Chapter");

    await chapterCards
      .filter({ hasText: "Opening Chapter" })
      .locator("button")
      .first()
      .click();

    page.once("dialog", async (dialog) => {
      await dialog.accept();
    });

    await page.getByRole("button", { name: "Delete chapter" }).click();
  });

  test("Writer publishes and archives through the browser", async ({ page }) => {
    await signIn(page, "writer@bookshop.local");
    await page.goto("/studio");

    const row = page
      .getByRole("row")
      .filter({ hasText: updatedTitle });

    await expect(row).toBeVisible();

    const editLink = row.getByRole("link", { name: "Edit" });
    await expect(editLink).toHaveAttribute(
      "href",
      /\/studio\/books\/[^/]+$/,
    );

    await editLink.click();

    await expect(page).toHaveURL(
      /\/studio\/books\/[^/]+$/,
    );

    const bookDetailsForm = page
      .locator("form")
      .filter({ hasText: "Book details" });

    await expect(bookDetailsForm).toBeVisible();

    await bookDetailsForm
      .getByRole("button", { name: "Publish", exact: true })
      .click();

    await expect(
      page.getByText("Status:").locator(".."),
    ).toContainText("published");

    await bookDetailsForm
      .getByRole("button", { name: "Archive", exact: true })
      .click();

    await expect(
      page.getByText("Status:").locator(".."),
    ).toContainText("archived");
  });

  test("Writer cannot access a foreign-owned draft by editor URL", async ({ page }) => {
    const prisma = getPrismaClient();

    if (!prisma) {
      throw new Error("Prisma client unavailable.");
    }

    const admin = await prisma.user.findUnique({
      where: {
        email: "admin@bookshop.local",
      },
    });

    if (!admin) {
      throw new Error("Admin development user is missing.");
    }

    const foreign = await prisma.book.create({
      data: {
        slug: `section-7-9-foreign-${Date.now()}`,
        title: "Section 7.9 Foreign Draft",
        authorId: admin.id,
        authorDisplayName: admin.name,
        description: "",
        genre: "Fiction",
        coverUrl: "",
        price: 0,
        ratingAverage: 0,
        reviewCount: 0,
        featured: false,
        newRelease: false,
        status: "DRAFT",
      },
    });

    try {
      await signIn(page, "writer@bookshop.local");
      await page.goto(`/studio/books/${foreign.id}`);

      await expect(
        page.getByRole("heading", { name: "Unable to open book" }),
      ).toBeVisible();
    } finally {
      await prisma.book.delete({
        where: {
          id: foreign.id,
        },
      });

      await prisma.$disconnect();
    }
  });

  test("Admin can use Writer Studio routes with explicit ownership rules", async ({ page }) => {
    await signIn(page, "admin@bookshop.local");
    await page.goto("/studio");

    await expect(
      page.getByRole("heading", { name: "Publishing overview" }),
    ).toBeVisible();
  });

  test.afterAll(async () => {
    const prisma = getPrismaClient();

    if (!prisma) {
      return;
    }

    const books = await prisma.book.findMany({
      where: {
        title: {
          in: [createdTitle, updatedTitle],
        },
      },
      select: {
        id: true,
      },
    });

    const ids = books.map((book) => book.id);

    if (ids.length > 0) {
      await prisma.readingProgress.deleteMany({
        where: {
          bookId: {
            in: ids,
          },
        },
      });

      await prisma.review.deleteMany({
        where: {
          bookId: {
            in: ids,
          },
        },
      });

      await prisma.wishlistItem.deleteMany({
        where: {
          bookId: {
            in: ids,
          },
        },
      });

      await prisma.orderItem.deleteMany({
        where: {
          bookId: {
            in: ids,
          },
        },
      });

      await prisma.chapter.deleteMany({
        where: {
          bookId: {
            in: ids,
          },
        },
      });

      await prisma.book.deleteMany({
        where: {
          id: {
            in: ids,
          },
        },
      });
    }

    await prisma.$disconnect();
  });
});