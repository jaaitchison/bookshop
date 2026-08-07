import { BookStatus, OrderStatus } from "@/src/generated/prisma/client";
import { getPrismaClient } from "@/src/lib/prisma";
import type { WriterSalesAnalytics } from "@/src/types/studio";

function requirePrisma() {
  const prisma = getPrismaClient();
  if (!prisma) {
    throw new Error("PostgreSQL is required for Writer sales analytics.");
  }
  return prisma;
}

function roundCurrency(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export async function getWriterSalesAnalytics(
  userId: string,
): Promise<WriterSalesAnalytics> {
  const books = await requirePrisma().book.findMany({
    where: {
      authorId: userId,
      status: BookStatus.PUBLISHED,
    },
    select: {
      id: true,
      title: true,
      orderItems: {
        where: {
          order: {
            is: {
              status: {
                notIn: [OrderStatus.CANCELLED, OrderStatus.REFUNDED],
              },
            },
          },
        },
        select: {
          price: true,
          quantity: true,
        },
      },
    },
    orderBy: {
      title: "asc",
    },
  });

  const bookSales = books.map((book) => {
    const booksSold = book.orderItems.reduce(
      (total, item) => total + item.quantity,
      0,
    );
    const revenue = roundCurrency(book.orderItems.reduce(
      (total, item) => total + Number(item.price.toString()) * item.quantity,
      0,
    ));

    return {
      bookId: book.id,
      title: book.title,
      booksSold,
      revenue,
    };
  });

  return {
    currency: "GBP",
    totalBooksSold: bookSales.reduce((total, book) => total + book.booksSold, 0),
    totalRevenue: roundCurrency(bookSales.reduce((total, book) => total + book.revenue, 0)),
    books: bookSales,
  };
}
