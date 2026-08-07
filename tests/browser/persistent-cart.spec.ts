import "dotenv/config";
import { expect, test, type Page } from "@playwright/test";
import { RoleKey } from "../../src/generated/prisma/client";
import { hashPassword } from "../../src/lib/password";
import { getPrismaClient } from "../../src/lib/prisma";

async function signIn(page: Page, email: string, password: string) {
  await page.context().clearCookies();
  await page.goto("/auth");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Continue to account" }).click();
  await expect(page).toHaveURL(/\/account(?:\?|$)/);
}

test("Section 10.1 keeps a Reader cart in PostgreSQL across reloads", async ({ page }) => {
  const prisma = getPrismaClient();
  if (!prisma) throw new Error("Prisma client unavailable.");
  const readerRole = await prisma.role.findUnique({ where: { key: RoleKey.READER } });
  if (!readerRole) throw new Error("Reader role is missing.");

  const suffix = Date.now().toString(36);
  const password = "BrowserCartPassword2026";
  const user = await prisma.user.create({
    data: {
      email: `section-10-1-browser-${suffix}@example.test`,
      username: `browser-cart-${suffix}`.slice(0, 32),
      name: "Persistent Cart Reader",
      passwordHash: await hashPassword(password),
      roles: { create: { roleId: readerRole.id } },
    },
  });
  const book = await prisma.book.create({
    data: {
      slug: `section-10-1-browser-${suffix}`,
      title: `Persistent Cart Book ${suffix}`,
      authorDisplayName: "Commerce Browser Author",
      description: "A database-priced book used to prove persistent cart synchronization.",
      price: 17.25,
      status: "PUBLISHED",
      visibility: "PUBLIC",
    },
  });

  try {
    await signIn(page, user.email, password);
    await page.goto(`/books/${book.slug}`);
    await page.getByRole("button", { name: "Add to cart" }).click();

    const drawer = page.getByRole("complementary");
    await expect(drawer.getByText(book.title)).toBeVisible();
    await expect(drawer.getByText("£17.25")).toBeVisible();
    await expect.poll(async () => {
      const item = await prisma.cartItem.findFirst({ where: { cart: { userId: user.id } } });
      return item?.quantity;
    }).toBe(1);

    await drawer.getByRole("button", { name: "+", exact: true }).click();
    await expect(drawer.getByText("£34.50")).toBeVisible();
    await expect.poll(async () => {
      const item = await prisma.cartItem.findFirst({ where: { cart: { userId: user.id } } });
      return item?.quantity;
    }).toBe(2);

    await page.reload();
    const desktopCart = page.getByRole("navigation", { name: "Main navigation" }).getByRole("button", { name: /Cart/ });
    await expect(desktopCart).toHaveText(/2/);
    await desktopCart.click();
    await expect(page.getByRole("complementary").getByText(book.title)).toBeVisible();
    await expect(page.getByRole("complementary").getByText("£34.50")).toBeVisible();

    await page.getByRole("complementary").getByRole("button", { name: "Remove" }).click();
    await expect(page.getByText("Your cart is empty.")).toBeVisible();
    await expect.poll(() => prisma.cartItem.findFirst({ where: { cart: { userId: user.id } } })).toBeNull();
  } finally {
    await prisma.user.delete({ where: { id: user.id } }).catch(() => undefined);
    await prisma.book.delete({ where: { id: book.id } }).catch(() => undefined);
    await prisma.$disconnect();
  }
});
