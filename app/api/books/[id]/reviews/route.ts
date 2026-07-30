import { NextResponse } from 'next/server';
import { addBookReview, getBookReviews } from '@/src/lib/reviews-store';
import { getAuthSessionFromCookieHeader, hasSessionRole } from '@/src/lib/auth-session';
import type { BookReview } from '@/src/types/book';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const reviews = await getBookReviews(id);
  return NextResponse.json(reviews);
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = getAuthSessionFromCookieHeader(request.headers.get('cookie'));
  const canReview = hasSessionRole(session, 'writer')
    || hasSessionRole(session, 'admin')
    || Boolean(session?.purchasedBookIds.includes(id));

  if (!canReview) {
    return NextResponse.json({ error: 'Purchase required before posting a review.' }, { status: 403 });
  }

  const body = await request.json() as Partial<BookReview>;

  if (!body.user || !body.comment || typeof body.rating !== 'number') {
    return NextResponse.json({ error: 'Please provide a name, comment, and rating.' }, { status: 400 });
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
