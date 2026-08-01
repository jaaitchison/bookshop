import { NextResponse } from "next/server";
import type { FilterOptions } from "@/src/data/books";
import {
  createCatalogBook,
  filterCatalogBooks,
  getCatalogBooks,
} from "@/src/lib/catalog-data";
import { getRequestDatabaseSession } from "@/src/lib/request-auth";
import { userHasRole } from "@/src/lib/role-authorization";
import type { Book } from "@/src/types/book";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  if (searchParams.get("includeDrafts") === "true") {
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

    const books = await getCatalogBooks();
    return NextResponse.json(books);
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
    const body = (await request.json()) as Partial<Book>;

    const book = await createCatalogBook({
      title: body.title,
      author: body.author,
      cover: body.cover,
      price: body.price,
      rating: body.rating,
      reviews: body.reviews,
      description: body.description,
      genre: body.genre,
      featured: body.featured,
      new: body.new,
      status: body.status,
    });

    return NextResponse.json(book, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Failed to create book" },
      { status: 400 },
    );
  }
}