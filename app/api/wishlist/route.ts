import { NextResponse } from 'next/server';
import { getWishlistItems, toggleWishlistItem } from '@/src/lib/wishlist-store';

export async function GET() {
  const wishlist = await getWishlistItems();
  return NextResponse.json(wishlist);
}

export async function POST(request: Request) {
  const body = await request.json() as { bookId?: string; action?: 'add' | 'remove' };

  if (!body.bookId) {
    return NextResponse.json({ error: 'A bookId is required.' }, { status: 400 });
  }

  const items = await toggleWishlistItem(body.bookId, body.action === 'remove' ? 'remove' : 'add');
  return NextResponse.json({ items });
}
