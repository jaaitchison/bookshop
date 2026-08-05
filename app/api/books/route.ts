import { NextResponse } from "next/server";
import type { FilterOptions } from "@/src/types/book";
import {
  filterCatalogBooks,
  getAllCatalogBooksForManagement,
  getCatalogGenres,
} from "@/src/lib/catalog-data";
import { getRequestDatabaseSession } from "@/src/lib/request-auth";
import { userHasRole } from "@/src/lib/role-authorization";
import {
  createWriterOwnedDraft,
} from "@/src/lib/writer-book-repository";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  if (searchParams.get("includeDrafts") === "true") {
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

    const books = await getAllCatalogBooksForManagement();
    return NextResponse.json(books);
  }

  if (searchParams.get("facets") === "genres") {
    return NextResponse.json({ genres: await getCatalogGenres() });
  }

  const filters: FilterOptions = {
    search: searchParams.get("search") ?? undefined,
    genre: searchParams.get("genre") ?? undefined,
    minPrice: searchParams.get("minPrice")
      ? Number(searchParams.get("minPrice"))
      : undefined,
    maxPrice: searchParams.get("maxPrice")
      ? Number(searchParams.get("maxPrice"))
      : undefined,
    minRating: searchParams.get("minRating")
      ? Number(searchParams.get("minRating"))
      : undefined,
    sortBy:
      (searchParams.get("sortBy") as FilterOptions["sortBy"]) ??
      undefined,
  };

  const books = await filterCatalogBooks(filters);
  return NextResponse.json(books);
}

export async function POST(request: Request) {
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
    const body = (await request.json()) as {
      title?: string;
      description?: string;
      genre?: string;
      cover?: string;
      price?: number;
      slug?: string;
      author?: string;
      authorId?: string;
      status?: string;
      featured?: boolean;
      new?: boolean;
      rating?: number;
      reviews?: number;
    };

    if (typeof body.title !== "string" || !body.title.trim()) {
      return NextResponse.json(
        { error: "Book title is required." },
        { status: 400 },
      );
    }

    const book = await createWriterOwnedDraft({
      userId: session.userId,
      title: body.title,
      slug:
        typeof body.slug === "string" && body.slug.trim()
          ? body.slug
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
    });

    return NextResponse.json(book, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to create book";

    return NextResponse.json(
      { error: message },
      { status: 400 },
    );
  }
}
