import { NextResponse } from "next/server";
import {
  deleteCatalogBook,
  updateCatalogBook,
} from "@/src/lib/catalog-data";
import { getRequestDatabaseSession } from "@/src/lib/request-auth";
import { userHasRole } from "@/src/lib/role-authorization";
import type { Book } from "@/src/types/book";

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await getRequestDatabaseSession(request);

  if (
    !session ||
    !(await userHasRole(session.userId, "writer"))
  ) {
    return NextResponse.json(
      { error: "Writer or admin access required." },
      { status: 403 },
    );
  }

  try {
    const { id } = await context.params;
    const body = (await request.json()) as Partial<Book>;

    const updatedBook = await updateCatalogBook(id, {
      ...body,
      price:
        body.price !== undefined
          ? Number(body.price)
          : undefined,
      rating:
        body.rating !== undefined
          ? Number(body.rating)
          : undefined,
      reviews:
        body.reviews !== undefined
          ? Number(body.reviews)
          : undefined,
    });

    if (!updatedBook) {
      return NextResponse.json(
        { error: "Book not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(updatedBook);
  } catch {
    return NextResponse.json(
      { error: "Failed to update book" },
      { status: 400 },
    );
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await getRequestDatabaseSession(request);

  if (
    !session ||
    !(await userHasRole(session.userId, "admin"))
  ) {
    return NextResponse.json(
      { error: "Admin access required." },
      { status: 403 },
    );
  }

  try {
    const { id } = await context.params;
    const deleted = await deleteCatalogBook(id);

    if (!deleted) {
      return NextResponse.json(
        { error: "Book not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Failed to delete book" },
      { status: 400 },
    );
  }
}