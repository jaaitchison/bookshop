import { NextResponse } from "next/server";
import {
  deleteCatalogBook,
} from "@/src/lib/catalog-data";
import { getRequestDatabaseSession } from "@/src/lib/request-auth";
import { userHasRole } from "@/src/lib/role-authorization";
import {
  canManageBook,
  updateManagedBookMetadata,
} from "@/src/lib/writer-book-repository";

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await getRequestDatabaseSession(request);

  if (!session) {
    return NextResponse.json(
      { error: "Authentication required." },
      { status: 401 },
    );
  }

  const [isWriter, isAdmin] = await Promise.all([
    userHasRole(session.userId, "writer"),
    userHasRole(session.userId, "admin"),
  ]);

  if (!isWriter && !isAdmin) {
    return NextResponse.json(
      { error: "Writer or admin access required." },
      { status: 403 },
    );
  }

  try {
    const { id } = await context.params;

    if (!(await canManageBook(session.userId, id))) {
      return NextResponse.json(
        { error: "You do not have permission to manage this book." },
        { status: 403 },
      );
    }

    const body = (await request.json()) as {
      title?: unknown;
      description?: unknown;
      genre?: unknown;
      cover?: unknown;
      price?: unknown;
      status?: unknown;
      author?: unknown;
      authorId?: unknown;
      rating?: unknown;
      reviews?: unknown;
      featured?: unknown;
      new?: unknown;
      manuscriptChapters?: unknown;
    };

    const status =
      body.status === "draft" ||
      body.status === "published" ||
      body.status === "archived"
        ? body.status
        : undefined;

    if (
      body.status !== undefined &&
      status === undefined
    ) {
      return NextResponse.json(
        { error: "Invalid publishing status." },
        { status: 400 },
      );
    }

    const updatedBook = await updateManagedBookMetadata(
      session.userId,
      id,
      {
        title:
          typeof body.title === "string"
            ? body.title
            : undefined,
        description:
          typeof body.description === "string"
            ? body.description
            : undefined,
        genre:
          typeof body.genre === "string"
            ? body.genre
            : undefined,
        coverUrl:
          typeof body.cover === "string"
            ? body.cover
            : undefined,
        price:
          typeof body.price === "number"
            ? body.price
            : undefined,
        status,
      },
    );

    if (!updatedBook) {
      return NextResponse.json(
        { error: "Book not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(updatedBook);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to update book";

    return NextResponse.json(
      { error: message },
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