import { NextResponse } from "next/server";
import {
  addBookReview,
  getBookReviews,
} from "@/src/lib/reviews-store";
import { getOrdersForUser } from "@/src/lib/order-repository";
import { getRequestDatabaseSession } from "@/src/lib/request-auth";
import { userHasRole } from "@/src/lib/role-authorization";
import type { BookReview } from "@/src/types/book";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const reviews = await getBookReviews(id);
  return NextResponse.json(reviews);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await getRequestDatabaseSession(request);

  if (!session) {
    return NextResponse.json(
      { error: "Sign in required before posting a review." },
      { status: 401 },
    );
  }

  const [isWriter, isAdmin, orders] = await Promise.all([
    userHasRole(session.userId, "writer"),
    userHasRole(session.userId, "admin"),
    getOrdersForUser(session.userId),
  ]);

  const hasPurchased = orders.some((order) =>
    order.items.some((item) => item.id === id),
  );

  if (!isWriter && !isAdmin && !hasPurchased) {
    return NextResponse.json(
      { error: "Purchase required before posting a review." },
      { status: 403 },
    );
  }

  const body = (await request.json()) as Partial<BookReview>;

  if (
    !body.user ||
    !body.comment ||
    typeof body.rating !== "number"
  ) {
    return NextResponse.json(
      { error: "Please provide a name, comment, and rating." },
      { status: 400 },
    );
  }

  const review: BookReview = {
    id: `review-${Date.now()}`,
    user: body.user.trim(),
    rating: Math.min(5, Math.max(1, body.rating)),
    comment: body.comment.trim(),
    createdAt: new Date().toISOString(),
  };

  const reviews = await addBookReview(id, review);
  return NextResponse.json(reviews);
}