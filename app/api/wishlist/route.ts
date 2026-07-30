import { NextResponse } from 'next/server';
import { getAuthSessionFromCookieHeader, hasSessionRole } from '@/src/lib/auth-session';
import { getWishlistItems, toggleWishlistItem } from '@/src/lib/wishlist-store';

export async function GET(request: Request) {
  const session = getAuthSessionFromCookieHeader(request.headers.get('cookie'));
  if (!hasSessionRole(session, 'reader')) {
    return NextResponse.json({ error: 'Sign in required for wishlist access.' }, { status: 401 });
  }

  const wishlist = await getWishlistItems();
  return NextResponse.json(wishlist);
}

export async function POST(request: Request) {
  const session = getAuthSessionFromCookieHeader(request.headers.get('cookie'));
  if (!hasSessionRole(session, 'reader')) {
    return NextResponse.json({ error: 'Sign in required for wishlist updates.' }, { status: 401 });
  }

  const body = await request.json() as { bookId?: string; action?: 'add' | 'remove' };

  if (!body.bookId) {
    return NextResponse.json({ error: 'A bookId is required.' }, { status: 400 });
  }

  const items = await toggleWishlistItem(body.bookId, body.action === 'remove' ? 'remove' : 'add');
  return NextResponse.json({ items });
}
