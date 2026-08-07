import { BookStatus, BookVisibility } from "@/src/generated/prisma/client";
import { coverUrlOrFallback } from "@/src/lib/cover-storage";
import { getPrismaClient } from "@/src/lib/prisma";
import type { CartItem, ShoppingCart } from "@/src/types/cart";

export const MAX_CART_ITEM_QUANTITY = 99;

export class CartValidationError extends Error {
  constructor(
    message: string,
    readonly code: "INVALID_QUANTITY" | "BOOK_UNAVAILABLE",
  ) {
    super(message);
    this.name = "CartValidationError";
  }
}

function requirePrisma() {
  const prisma = getPrismaClient();
  if (!prisma) throw new Error("PostgreSQL is unavailable for cart operations.");
  return prisma;
}

function requireQuantity(quantity: number) {
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_CART_ITEM_QUANTITY) {
    throw new CartValidationError(
      `Quantity must be a whole number between 1 and ${MAX_CART_ITEM_QUANTITY}.`,
      "INVALID_QUANTITY",
    );
  }
}

const purchasableBookWhere = {
  status: BookStatus.PUBLISHED,
  visibility: BookVisibility.PUBLIC,
} as const;

type CartWithItems = Awaited<ReturnType<ReturnType<typeof requirePrisma>["cart"]["findUnique"]>>;

function emptyCart(): ShoppingCart {
  return {
    id: null,
    items: [],
    count: 0,
    subtotal: 0,
    currency: "GBP",
    updatedAt: null,
  };
}

function roundCurrency(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function toShoppingCart(cart: CartWithItems): ShoppingCart {
  if (!cart || !("items" in cart) || !Array.isArray(cart.items)) return emptyCart();

  const items = cart.items.map((item): CartItem => {
    const book = item.book;
    const unitPrice = Number(book.price.toString());

    return {
      id: item.id,
      quantity: item.quantity,
      unitPrice,
      lineTotal: roundCurrency(unitPrice * item.quantity),
      book: {
        id: book.slug || book.id,
        title: book.title,
        author: book.authorDisplayName,
        cover: coverUrlOrFallback(book.coverUrl),
        price: unitPrice,
        rating: Number(book.ratingAverage.toString()),
        reviews: book.reviewCount,
        description: book.description,
        genre: book.genre,
        featured: book.featured,
        new: book.newRelease,
        status: "published",
        manuscriptChapters: [],
      },
    };
  });

  return {
    id: cart.id,
    items,
    count: items.reduce((sum, item) => sum + item.quantity, 0),
    subtotal: roundCurrency(items.reduce((sum, item) => sum + item.lineTotal, 0)),
    currency: "GBP",
    updatedAt: cart.updatedAt.toISOString(),
  };
}

export async function getCartForUser(userId: string): Promise<ShoppingCart> {
  const cart = await requirePrisma().cart.findUnique({
    where: { userId },
    include: {
      items: {
        where: { book: { is: purchasableBookWhere } },
        include: { book: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  return toShoppingCart(cart);
}

async function findBookByPublicIdentifier(identifier: string, includeUnavailable = false) {
  return requirePrisma().book.findFirst({
    where: {
      ...(includeUnavailable ? {} : purchasableBookWhere),
      OR: [{ id: identifier }, { slug: identifier }],
    },
    select: { id: true },
  });
}

export async function addCartItemForUser(
  userId: string,
  bookIdentifier: string,
  quantity = 1,
): Promise<ShoppingCart> {
  requireQuantity(quantity);
  const prisma = requirePrisma();
  const book = await findBookByPublicIdentifier(bookIdentifier);
  if (!book) {
    throw new CartValidationError("This book is not available for purchase.", "BOOK_UNAVAILABLE");
  }

  await prisma.$transaction(async (tx) => {
    const cart = await tx.cart.upsert({
      where: { userId },
      update: {},
      create: { userId },
      select: { id: true },
    });
    const existing = await tx.cartItem.findUnique({
      where: { cartId_bookId: { cartId: cart.id, bookId: book.id } },
      select: { quantity: true },
    });
    const nextQuantity = (existing?.quantity ?? 0) + quantity;
    requireQuantity(nextQuantity);

    await tx.cartItem.upsert({
      where: { cartId_bookId: { cartId: cart.id, bookId: book.id } },
      update: { quantity: nextQuantity },
      create: { cartId: cart.id, bookId: book.id, quantity },
    });
  });

  return getCartForUser(userId);
}

export async function setCartItemQuantityForUser(
  userId: string,
  bookIdentifier: string,
  quantity: number,
): Promise<ShoppingCart> {
  requireQuantity(quantity);
  const [prisma, book] = [requirePrisma(), await findBookByPublicIdentifier(bookIdentifier)];
  if (!book) {
    throw new CartValidationError("This book is not available for purchase.", "BOOK_UNAVAILABLE");
  }

  const cart = await prisma.cart.findUnique({ where: { userId }, select: { id: true } });
  if (!cart) return emptyCart();

  await prisma.cartItem.updateMany({
    where: { cartId: cart.id, bookId: book.id },
    data: { quantity },
  });
  return getCartForUser(userId);
}

export async function removeCartItemForUser(
  userId: string,
  bookIdentifier: string,
): Promise<ShoppingCart> {
  const prisma = requirePrisma();
  const [cart, book] = await Promise.all([
    prisma.cart.findUnique({ where: { userId }, select: { id: true } }),
    findBookByPublicIdentifier(bookIdentifier, true),
  ]);
  if (!cart || !book) return getCartForUser(userId);

  await prisma.cartItem.deleteMany({ where: { cartId: cart.id, bookId: book.id } });
  return getCartForUser(userId);
}

export async function clearCartForUser(userId: string): Promise<ShoppingCart> {
  const prisma = requirePrisma();
  const cart = await prisma.cart.findUnique({ where: { userId }, select: { id: true } });
  if (!cart) return emptyCart();

  await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
  return getCartForUser(userId);
}
