import { OrderStatus } from "@/src/generated/prisma/client";
import type { AccountOrder } from "@/src/types/account";
import {
  getAccountOrderById as getJsonOrderById,
  getAccountOrders as getJsonOrders,
  saveAccountOrder as saveJsonOrder,
} from "@/src/lib/account-store";
import { getPrismaClient } from "@/src/lib/prisma";

function toOrderStatus(status: AccountOrder["status"]): OrderStatus {
  switch (status) {
    case "Packed":
      return OrderStatus.PACKED;
    case "Shipped":
      return OrderStatus.SHIPPED;
    case "Delivered":
      return OrderStatus.DELIVERED;
    case "Processing":
    default:
      return OrderStatus.PROCESSING;
  }
}

function fromOrderStatus(status: OrderStatus): AccountOrder["status"] {
  switch (status) {
    case OrderStatus.PACKED:
      return "Packed";
    case OrderStatus.SHIPPED:
      return "Shipped";
    case OrderStatus.DELIVERED:
      return "Delivered";
    default:
      return "Processing";
  }
}

type DatabaseOrder = {
  id: string;
  orderedAt: Date;
  total: { toNumber(): number };
  status: OrderStatus;
  shippingName: string;
  shippingEmail: string;
  shippingAddress: string;
  shippingCity: string;
  shippingPostcode: string;
  items: Array<{
    bookId: string | null;
    titleSnapshot: string;
    authorSnapshot: string;
    price: { toNumber(): number };
    quantity: number;
  }>;
};

function databaseOrderToAccountOrder(order: DatabaseOrder): AccountOrder {
  return {
    id: order.id,
    orderedAt: order.orderedAt.toISOString(),
    total: order.total.toNumber(),
    status: fromOrderStatus(order.status),
    items: order.items.map((item) => ({
      id: item.bookId ?? "",
      title: item.titleSnapshot,
      author: item.authorSnapshot,
      price: item.price.toNumber(),
      quantity: item.quantity,
    })),
    shippingName: order.shippingName,
    shippingEmail: order.shippingEmail,
    shippingAddress: order.shippingAddress,
    shippingCity: order.shippingCity,
    shippingZip: order.shippingPostcode,
  };
}

async function databaseUserExists(userId: string): Promise<boolean> {
  const prisma = getPrismaClient();

  if (!prisma) {
    return false;
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });

  return Boolean(user);
}

export async function getOrdersForUser(
  userId: string,
): Promise<AccountOrder[]> {
  const prisma = getPrismaClient();

  if (prisma) {
    try {
      const orders = await prisma.order.findMany({
        where: { userId },
        include: { items: true },
        orderBy: { orderedAt: "desc" },
      });

      if (orders.length > 0) {
        return orders.map(databaseOrderToAccountOrder);
      }

      // During transition, an empty database result may still have legacy JSON.
      const fallback = await getJsonOrders(userId);
      if (fallback.length > 0) {
        return fallback;
      }

      return [];
    } catch (error) {
      console.warn(
        "PostgreSQL order read failed; using JSON fallback.",
        error,
      );
    }
  }

  return getJsonOrders(userId);
}

export async function getOrderForUserById(
  userId: string,
  orderId: string,
): Promise<AccountOrder | undefined> {
  const prisma = getPrismaClient();

  if (prisma) {
    try {
      const order = await prisma.order.findFirst({
        where: {
          id: orderId,
          userId,
        },
        include: { items: true },
      });

      if (order) {
        return databaseOrderToAccountOrder(order);
      }
    } catch (error) {
      console.warn(
        "PostgreSQL order lookup failed; using JSON fallback.",
        error,
      );
    }
  }

  return getJsonOrderById(userId, orderId);
}

export async function saveOrderForUser(
  userId: string,
  order: AccountOrder,
  stripe?: {
    sessionId?: string | null;
    paymentId?: string | null;
  },
): Promise<AccountOrder[]> {
  const prisma = getPrismaClient();

  let databaseSaved = false;

  if (prisma && (await databaseUserExists(userId))) {
    try {
      await prisma.$transaction(async (tx) => {
        const existing = await tx.order.findUnique({
          where: { id: order.id },
          select: { id: true },
        });

        if (existing) {
          await tx.orderItem.deleteMany({
            where: { orderId: order.id },
          });

          await tx.order.update({
            where: { id: order.id },
            data: {
              userId,
              status: toOrderStatus(order.status),
              total: order.total,
              currency: "GBP",
              stripeSessionId: stripe?.sessionId ?? undefined,
              stripePaymentId: stripe?.paymentId ?? undefined,
              shippingName: order.shippingName,
              shippingEmail: order.shippingEmail,
              shippingAddress: order.shippingAddress,
              shippingCity: order.shippingCity,
              shippingPostcode: order.shippingZip,
              orderedAt: new Date(order.orderedAt),
              items: {
                create: order.items.map((item) => ({
                  bookId: item.id || null,
                  titleSnapshot: item.title,
                  authorSnapshot: item.author,
                  price: item.price,
                  quantity: item.quantity,
                })),
              },
            },
          });
        } else {
          await tx.order.create({
            data: {
              id: order.id,
              userId,
              status: toOrderStatus(order.status),
              total: order.total,
              currency: "GBP",
              stripeSessionId: stripe?.sessionId ?? null,
              stripePaymentId: stripe?.paymentId ?? null,
              shippingName: order.shippingName,
              shippingEmail: order.shippingEmail,
              shippingAddress: order.shippingAddress,
              shippingCity: order.shippingCity,
              shippingPostcode: order.shippingZip,
              orderedAt: new Date(order.orderedAt),
              items: {
                create: order.items.map((item) => ({
                  bookId: item.id || null,
                  titleSnapshot: item.title,
                  authorSnapshot: item.author,
                  price: item.price,
                  quantity: item.quantity,
                })),
              },
            },
          });
        }
      });

      databaseSaved = true;
    } catch (error) {
      console.error(
        "PostgreSQL order write failed; preserving JSON compatibility copy.",
        error,
      );
    }
  }

  // Keep JSON mirrored during Section 6.2 even after successful DB writes.
  const jsonOrders = await saveJsonOrder(userId, order);

  if (!databaseSaved) {
    return jsonOrders;
  }

  return getOrdersForUser(userId);
}