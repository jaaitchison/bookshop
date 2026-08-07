import { OrderStatus } from "@/src/generated/prisma/client";
import type { AccountOrder } from "@/src/types/account";
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

function databaseOrderToAccountOrder(
  order: DatabaseOrder,
): AccountOrder {
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

function requirePrisma() {
  const prisma = getPrismaClient();

  if (!prisma) {
    throw new Error("PostgreSQL is unavailable for order operations.");
  }

  return prisma;
}

export async function getOrdersForUser(
  userId: string,
): Promise<AccountOrder[]> {
  const prisma = requirePrisma();

  const orders = await prisma.order.findMany({
    where: {
      userId,
    },
    include: {
      items: true,
    },
    orderBy: {
      orderedAt: "desc",
    },
  });

  return orders.map(databaseOrderToAccountOrder);
}

export async function getOrderForUserById(
  userId: string,
  orderId: string,
): Promise<AccountOrder | undefined> {
  const prisma = requirePrisma();

  const order = await prisma.order.findFirst({
    where: {
      id: orderId,
      userId,
    },
    include: {
      items: true,
    },
  });

  return order
    ? databaseOrderToAccountOrder(order)
    : undefined;
}

export async function saveOrderForUser(
  userId: string,
  order: AccountOrder,
  stripe?: {
    sessionId?: string | null;
    paymentId?: string | null;
  },
): Promise<AccountOrder[]> {
  const prisma = requirePrisma();

  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      id: true,
    },
  });

  if (!user) {
    throw new Error(
      `Cannot save order for unknown PostgreSQL user ${userId}.`,
    );
  }

  await prisma.$transaction(async (tx) => {
    const existing = await tx.order.findUnique({
      where: {
        id: order.id,
      },
      select: {
        id: true,
        userId: true,
      },
    });

    if (existing && existing.userId !== userId) {
      throw new Error(
        "Order ID already belongs to another PostgreSQL user.",
      );
    }

    const orderData = {
      userId,
      status: toOrderStatus(order.status),
      total: order.total,
      currency: "GBP",
      shippingName: order.shippingName,
      shippingEmail: order.shippingEmail,
      shippingAddress: order.shippingAddress,
      shippingCity: order.shippingCity,
      shippingPostcode: order.shippingZip,
      orderedAt: new Date(order.orderedAt),
    };

    if (existing) {
      await tx.orderItem.deleteMany({
        where: {
          orderId: order.id,
        },
      });

      await tx.order.update({
        where: {
          id: order.id,
        },
        data: {
          ...orderData,
          ...(stripe?.sessionId !== undefined
            ? { stripeSessionId: stripe.sessionId }
            : {}),
          ...(stripe?.paymentId !== undefined
            ? { stripePaymentId: stripe.paymentId }
            : {}),
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
          ...orderData,
          stripeSessionId: stripe?.sessionId ?? null,
          stripePaymentId: stripe?.paymentId ?? null,
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

  return getOrdersForUser(userId);
}