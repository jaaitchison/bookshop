import { NextResponse } from "next/server";
import { getOrdersForUser } from "@/src/lib/order-repository";
import {
  getPublishedBookReviews,
  upsertBookReviewForUser,
} from "@/src/lib/review-repository";
import { getRequestDatabaseSession } from "@/src/lib/request-auth";
import { userHasRole } from "@/src/lib/role-authorization";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const reviews = await getPublishedBookReviews(id);

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

  const body = (await request.json()) as {
    rating?: number;
    comment?: string;
  };

  if (
    typeof body.rating !== "number" ||
    typeof body.comment !== "string"
  ) {
    return NextResponse.json(
      { error: "Please provide a comment and rating." },
      { status: 400 },
    );
  }

  try {
    const reviews = await upsertBookReviewForUser({
      userId: session.userId,
      bookId: id,
      rating: body.rating,
      comment: body.comment,
      verifiedPurchase: hasPurchased,
    });

    return NextResponse.json(reviews);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Review could not be saved.";

    return NextResponse.json(
      { error: message },
      { status: 400 },
    );
  }
}