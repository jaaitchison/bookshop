import {
  BookStatus,
  BookVisibility,
  PaymentAttemptStatus,
} from "@/src/generated/prisma/client";
import { deliverOrderConfirmation } from "@/src/lib/order-confirmation-service";
import { getPrismaClient } from "@/src/lib/prisma";
import type { CheckoutShipping, PaymentAttemptState } from "@/src/types/checkout";
import type { DigitalContentConsent } from "@/src/lib/legal-policy";

const MINIMUM_PAYMENT_CENTS = 50;
const MAXIMUM_PAYMENT_CENTS = 99_999_999;

export class CheckoutValidationError extends Error {
  constructor(
    message: string,
    readonly code: "EMPTY_CART" | "INVALID_SHIPPING" | "INVALID_AMOUNT",
  ) {
    super(message);
    this.name = "CheckoutValidationError";
  }
}

export class PaymentVerificationError extends Error {
  constructor(
    message: string,
    readonly code:
      | "ATTEMPT_NOT_FOUND"
      | "PAYMENT_MISMATCH"
      | "INCOMPLETE_METADATA",
  ) {
    super(message);
    this.name = "PaymentVerificationError";
  }
}

function requirePrisma() {
  const prisma = getPrismaClient();
  if (!prisma) throw new Error("PostgreSQL is unavailable for payment operations.");
  return prisma;
}

function requiredText(value: unknown, label: string, min: number, max: number) {
  if (typeof value !== "string") {
    throw new CheckoutValidationError(`${label} is required.`, "INVALID_SHIPPING");
  }
  const normalized = value.trim();
  if (normalized.length < min || normalized.length > max) {
    throw new CheckoutValidationError(
      `${label} must be between ${min} and ${max} characters.`,
      "INVALID_SHIPPING",
    );
  }
  return normalized;
}

export function normalizeCheckoutShipping(value: unknown): CheckoutShipping {
  const source = value && typeof value === "object"
    ? value as Record<string, unknown>
    : {};
  const email = requiredText(source.email, "Email", 3, 254).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new CheckoutValidationError("Enter a valid email address.", "INVALID_SHIPPING");
  }

  return {
    name: requiredText(source.name, "Name", 2, 100),
    email,
    address: requiredText(source.address, "Address", 3, 200),
    city: requiredText(source.city, "City", 2, 100),
    postcode: requiredText(source.postcode, "Postcode", 2, 20),
  };
}

function priceToCents(price: { toString(): string }) {
  return Math.round(Number(price.toString()) * 100);
}

export async function createPaymentAttemptForUser(
  userId: string,
  shipping: CheckoutShipping,
  consent: DigitalContentConsent,
) {
  const prisma = requirePrisma();
  const cart = await prisma.cart.findUnique({
    where: { userId },
    include: {
      items: {
        where: {
          book: {
            is: {
              status: BookStatus.PUBLISHED,
              visibility: BookVisibility.PUBLIC,
            },
          },
        },
        include: { book: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!cart?.items.length) {
    throw new CheckoutValidationError("Your cart is empty.", "EMPTY_CART");
  }

  const items = cart.items.map((item) => ({
    bookId: item.book.id,
    titleSnapshot: item.book.title,
    authorSnapshot: item.book.authorDisplayName,
    priceCents: priceToCents(item.book.price),
    quantity: item.quantity,
  }));
  const amountCents = items.reduce(
    (sum, item) => sum + item.priceCents * item.quantity,
    0,
  );
  if (amountCents < MINIMUM_PAYMENT_CENTS || amountCents > MAXIMUM_PAYMENT_CENTS) {
    throw new CheckoutValidationError(
      "Cart total is outside the supported payment range.",
      "INVALID_AMOUNT",
    );
  }

  return prisma.paymentAttempt.create({
    data: {
      userId,
      cartId: cart.id,
      amountCents,
      currency: "gbp",
      shippingName: shipping.name,
      shippingEmail: shipping.email,
      shippingAddress: shipping.address,
      shippingCity: shipping.city,
      shippingPostcode: shipping.postcode,
      digitalContentConsentAt: consent.acceptedAt,
      termsVersion: consent.termsVersion,
      refundPolicyVersion: consent.refundPolicyVersion,
      items: { create: items },
    },
    include: { items: true },
  });
}

export async function attachStripePaymentIntent(
  paymentAttemptId: string,
  stripePaymentIntentId: string,
) {
  return requirePrisma().paymentAttempt.update({
    where: { id: paymentAttemptId },
    data: { stripePaymentIntentId },
  });
}

export async function markPaymentAttemptFailed(
  paymentAttemptId: string,
  failureMessage: string,
) {
  await requirePrisma().paymentAttempt.updateMany({
    where: { id: paymentAttemptId, status: PaymentAttemptStatus.PENDING },
    data: {
      status: PaymentAttemptStatus.FAILED,
      failureMessage: failureMessage.slice(0, 500),
    },
  });
}

export async function getPaymentAttemptForUserByIntent(
  userId: string,
  stripePaymentIntentId: string,
) {
  const attempt = await requirePrisma().paymentAttempt.findFirst({
    where: { userId, stripePaymentIntentId },
    select: {
      id: true,
      stripePaymentIntentId: true,
      status: true,
      amountCents: true,
      currency: true,
      failureMessage: true,
      createdAt: true,
      updatedAt: true,
      order: { select: { id: true } },
    },
  });

  return attempt
    ? {
        ...attempt,
        status: attempt.status as PaymentAttemptState,
        amount: attempt.amountCents / 100,
        createdAt: attempt.createdAt.toISOString(),
        updatedAt: attempt.updatedAt.toISOString(),
        orderId: attempt.order?.id ?? null,
      }
    : null;
}

interface SucceededPaymentIntent {
  id: string;
  amount: number;
  amount_received: number;
  currency: string;
  metadata: Record<string, string>;
}

export async function recordSucceededPaymentIntent(
  eventId: string,
  eventType: string,
  paymentIntent: SucceededPaymentIntent,
) {
  const prisma = requirePrisma();
  const paymentAttemptId = paymentIntent.metadata.paymentAttemptId;
  const userId = paymentIntent.metadata.userId;
  if (!paymentAttemptId || !userId) {
    throw new PaymentVerificationError(
      "PaymentIntent metadata is incomplete.",
      "INCOMPLETE_METADATA",
    );
  }


  const fulfil = () => prisma.$transaction(async (tx) => {
    const existingEvent = await tx.stripeWebhookEvent.findUnique({
      where: { eventId },
      select: { paymentAttemptId: true },
    });
    const attempt = await tx.paymentAttempt.findUnique({
      where: { id: paymentAttemptId },
      include: { items: true, order: { select: { id: true } } },
    });
    if (!attempt) {
      throw new PaymentVerificationError("Payment attempt was not found.", "ATTEMPT_NOT_FOUND");
    }
    if (
      attempt.userId !== userId ||
      attempt.stripePaymentIntentId !== paymentIntent.id ||
      attempt.amountCents !== paymentIntent.amount ||
      attempt.amountCents !== paymentIntent.amount_received ||
      attempt.currency !== paymentIntent.currency.toLowerCase() ||
      (existingEvent?.paymentAttemptId && existingEvent.paymentAttemptId !== attempt.id)
    ) {
      throw new PaymentVerificationError(
        "PaymentIntent does not match the server-owned payment attempt.",
        "PAYMENT_MISMATCH",
      );
    }

    if (attempt.order) {
      await tx.paymentAttempt.update({
        where: { id: attempt.id },
        data: { status: PaymentAttemptStatus.SUCCEEDED, failureMessage: "" },
      });
      if (!existingEvent) {
        await tx.stripeWebhookEvent.create({
          data: { eventId, eventType, paymentAttemptId: attempt.id },
        });
      }
      return {
        duplicate: true,
        paymentAttemptId: attempt.id,
        orderId: attempt.order.id,
        libraryItemsGranted: 0,
      };
    }

    const order = await tx.order.create({
      data: {
        userId: attempt.userId,
        paymentAttemptId: attempt.id,
        stripePaymentId: paymentIntent.id,
        total: attempt.amountCents / 100,
        currency: attempt.currency.toUpperCase(),
        shippingName: attempt.shippingName,
        shippingEmail: attempt.shippingEmail,
        shippingAddress: attempt.shippingAddress,
        shippingCity: attempt.shippingCity,
        shippingPostcode: attempt.shippingPostcode,
        items: {
          create: attempt.items.map((item) => ({
            bookId: item.bookId,
            titleSnapshot: item.titleSnapshot,
            authorSnapshot: item.authorSnapshot,
            price: item.priceCents / 100,
            quantity: item.quantity,
          })),
        },
        confirmation: { create: { recipient: attempt.shippingEmail } },
      },
      include: { items: true },
    });

    const orderItemByBook = new Map(
      order.items.flatMap((item) => item.bookId ? [[item.bookId, item.id] as const] : []),
    );
    const libraryItems = attempt.items.flatMap((item) => {
      const orderItemId = orderItemByBook.get(item.bookId);
      return orderItemId
        ? [{ userId: attempt.userId, bookId: item.bookId, orderItemId }]
        : [];
    });
    const granted = await tx.libraryItem.createMany({
      data: libraryItems,
      skipDuplicates: true,
    });

    if (attempt.cartId) {
      for (const purchased of attempt.items) {
        const current = await tx.cartItem.findUnique({
          where: { cartId_bookId: { cartId: attempt.cartId, bookId: purchased.bookId } },
        });
        if (!current) continue;
        if (current.quantity <= purchased.quantity) {
          await tx.cartItem.delete({ where: { id: current.id } });
        } else {
          await tx.cartItem.update({
            where: { id: current.id },
            data: { quantity: { decrement: purchased.quantity } },
          });
        }
      }
    }

    await tx.paymentAttempt.update({
      where: { id: attempt.id },
      data: { status: PaymentAttemptStatus.SUCCEEDED, failureMessage: "" },
    });
    if (!existingEvent) {
      await tx.stripeWebhookEvent.create({
        data: { eventId, eventType, paymentAttemptId: attempt.id },
      });
    }

    return {
      duplicate: Boolean(existingEvent),
      paymentAttemptId: attempt.id,
      orderId: order.id,
      libraryItemsGranted: granted.count,
    };
  });

  let result;
  try {
    result = await fulfil();
  } catch (error) {
    if ((error as { code?: string }).code !== "P2002") throw error;
    result = await fulfil();
  }

  const confirmation = await deliverOrderConfirmation(result.orderId).catch(() => ({ status: "failed" as const }));
  return { ...result, confirmationStatus: confirmation.status };
}
