import { NextResponse } from "next/server";
import { getRequestDatabaseSession } from "@/src/lib/request-auth";
import { userHasRole } from "@/src/lib/role-authorization";
import {
  getWishlistItemsForUser,
  toggleWishlistItemForUser,
} from "@/src/lib/wishlist-repository";

async function requireReader(request: Request) {
  const session = await getRequestDatabaseSession(request);

  if (
    !session ||
    !(await userHasRole(session.userId, "reader"))
  ) {
    return null;
  }

  return session;
}

export async function GET(request: Request) {
  const session = await requireReader(request);

  if (!session) {
    return NextResponse.json(
      { error: "Sign in required for wishlist access." },
      { status: 401 },
    );
  }

  const items = await getWishlistItemsForUser(session.userId);

  return NextResponse.json({ items });
}

export async function POST(request: Request) {
  const session = await requireReader(request);

  if (!session) {
    return NextResponse.json(
      { error: "Sign in required for wishlist updates." },
      { status: 401 },
    );
  }

  const body = (await request.json()) as {
    bookId?: string;
    action?: "add" | "remove";
  };

  if (!body.bookId) {
    return NextResponse.json(
      { error: "A bookId is required." },
      { status: 400 },
    );
  }

  try {
    const items = await toggleWishlistItemForUser(
      session.userId,
      body.bookId,
      body.action === "remove" ? "remove" : "add",
    );

    return NextResponse.json({ items });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Wishlist update failed.";

    return NextResponse.json(
      { error: message },
      { status: 400 },
    );
  }
}