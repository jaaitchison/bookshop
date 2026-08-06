import "dotenv/config";
import { expect, test, type Page } from "@playwright/test";
import { RoleKey } from "../../src/generated/prisma/client";
import { hashPassword } from "../../src/lib/password";
import { getPrismaClient } from "../../src/lib/prisma";
import { recordSucceededPaymentIntent } from "../../src/lib/payment-attempt-repository";

async function signIn(page: Page, email: string, password: string) {
  await page.context().clearCookies();
  await page.goto("/auth");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Continue to account" }).click();
  await expect(page).toHaveURL(/\/account(?:\?|$)/);
}

test("Section 10.3 exposes a fulfilled order and library grant after verified payment", async ({ page }) => {
  const prisma = getPrismaClient();
  if (!prisma) throw new Error("Prisma client unavailable.");
  const readerRole = await prisma.role.findUnique({ where: { key: RoleKey.READER } });
  if (!readerRole) throw new Error("Reader role is missing.");

  const suffix = Date.now().toString(36);
  const password = "BrowserPaymentPassword2026";
  const user = await prisma.user.create({
    data: {
      email: `section-10-2-browser-${suffix}@example.test`,
      username: `browser-payment-${suffix}`.slice(0, 32),
      name: "Payment Browser Reader",
      passwordHash: await hashPassword(password),
      roles: { create: { roleId: readerRole.id } },
    },
  });
  const book = await prisma.book.create({
    data: {
      slug: `section-10-2-browser-${suffix}`,
      title: `Secure Payment Book ${suffix}`,
      authorDisplayName: "Payment Browser Author",
      price: 13.75,
      status: "PUBLISHED",
      visibility: "PUBLIC",
    },
  });
  const cart = await prisma.cart.create({
    data: {
      userId: user.id,
      items: { create: { bookId: book.id, quantity: 2 } },
    },
  });
  const paymentIntentId = `pi_section_10_2_browser_${suffix}`;
  const paymentAttempt = await prisma.paymentAttempt.create({
    data: {
      userId: user.id,
      cartId: cart.id,
      stripePaymentIntentId: paymentIntentId,
      status: "PENDING",
      amountCents: 2750,
      currency: "gbp",
      shippingName: user.name,
      shippingEmail: user.email,
      shippingAddress: "10 Browser Street",
      shippingCity: "London",
      shippingPostcode: "SW1A 1AA",
      items: {
        create: {
          bookId: book.id,
          titleSnapshot: book.title,
          authorSnapshot: book.authorDisplayName,
          priceCents: 1375,
          quantity: 2,
        },
      },
    },
  });

  try {
    await signIn(page, user.email, password);
    await page.goto("/checkout");
    await expect(page.getByText(book.title)).toBeVisible();
    await expect(page.getByText("£27.50")).toHaveCount(3);
    await expect(page.getByLabel("Full name")).toBeVisible();
    await expect(page.getByLabel("Card number")).toHaveCount(0);
    await expect(page.getByLabel("CVC")).toHaveCount(0);
    await expect(page.getByText("Payment details are collected and tokenized by Stripe.")).toHaveCount(0);

    await recordSucceededPaymentIntent(
      `evt_section_10_3_browser_${suffix}`,
      "payment_intent.succeeded",
      {
        id: paymentIntentId,
        amount: 2750,
        amount_received: 2750,
        currency: "gbp",
        metadata: { paymentAttemptId: paymentAttempt.id, userId: user.id },
      },
    );

    const statusResponse = await page.request.get(
      `/api/checkout/status?payment_intent=${encodeURIComponent(paymentIntentId)}`,
    );
    const statusPayload = await statusResponse.json() as { attempt?: { orderId: string | null }; error?: string };
    expect(statusResponse.ok(), statusPayload.error).toBeTruthy();
    expect(statusPayload.attempt?.orderId).toBeTruthy();

    await page.goto(`/checkout/success?payment_intent=${paymentIntentId}&redirect_status=succeeded`);
    await expect(page.getByRole("heading", { name: "Stripe confirmed your payment" })).toBeVisible();
    await expect(page.getByText(/books are ready in your library/)).toBeVisible();
    await page.getByRole("link", { name: "Open your library" }).click();
    await expect(page).toHaveURL(/\/library$/);
    await expect(page.getByRole("heading", { name: book.title })).toBeVisible();
  } finally {
    await prisma.user.delete({ where: { id: user.id } }).catch(() => undefined);
    await prisma.book.delete({ where: { id: book.id } }).catch(() => undefined);
    await prisma.$disconnect();
  }
});
