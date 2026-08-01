'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { getOrdersStorageKey, useAccount } from '@/src/context/AccountContext';
import { accountLibrary } from '@/src/data/account';
import { mockBooks } from '@/src/data/books';
import type { AccountOrder } from '@/src/types/account';

export default function LibraryPage() {
  const { isAuthenticated, orders, profile } = useAccount();
  const [wishlistItems, setWishlistItems] = useState<string[]>([]);
  const [readingProgressByBook] = useState<Record<string, number>>(() => {
    if (typeof window === 'undefined') {
      return {};
    }

    return Object.keys(window.localStorage)
      .filter((key) => key.startsWith('bookshop-reading-progress-'))
      .reduce<Record<string, number>>((acc, key) => {
        try {
          const raw = window.localStorage.getItem(key);
          if (!raw) {
            return acc;
          }
          const parsed = JSON.parse(raw) as { progress?: number };
          const progress = typeof parsed.progress === 'number' ? parsed.progress : 0;
          const bookId = key.replace('bookshop-reading-progress-', '');
          acc[bookId] = progress;
          return acc;
        } catch {
          return acc;
        }
      }, {});
  });

  useEffect(() => {
    const loadWishlist = async () => {
      try {
        const response = await fetch('/api/wishlist');
        const data = (await response.json()) as { items?: string[] };
        setWishlistItems(data.items ?? []);
      } catch {
        setWishlistItems([]);
      }
    };

    void loadWishlist();
  }, []);

  const resolvedOrders = useMemo(() => {
    if (orders.length > 0) {
      return orders;
    }

    if (typeof window === 'undefined' || !profile.id) {
      return [] as AccountOrder[];
    }

    try {
      const storedValue = window.localStorage.getItem(getOrdersStorageKey(profile.id));
      if (!storedValue) {
        return [] as AccountOrder[];
      }

      const parsed = JSON.parse(storedValue) as AccountOrder[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [] as AccountOrder[];
    }
  }, [orders, profile.id]);

  const libraryItems = useMemo(() => {
    const purchased = resolvedOrders.flatMap((order) => order.items).reduce<Record<string, typeof accountLibrary[number]>>((acc, item) => {
      if (!acc[item.id]) {
        const bookDetails = mockBooks.find((book) => book.id === item.id);
        acc[item.id] = {
          id: item.id,
          title: item.title,
          author: item.author,
          cover: bookDetails?.cover ?? '/logo.jpg',
          status: 'Purchased',
          progress: `${item.quantity} copy${item.quantity === 1 ? '' : 'ies'} purchased`,
        };
      }
      return acc;
    }, {});

    const wishlistBooks = wishlistItems
      .map((bookId) => mockBooks.find((book) => book.id === bookId))
      .filter((book): book is (typeof mockBooks)[number] => !!book)
      .map((book) => ({
        id: book.id,
        title: book.title,
        author: book.author,
        cover: book.cover,
        status: 'Wishlist',
        progress: 'Saved for later',
      }));

    const purchasedBooks = Object.values(purchased);
    return purchasedBooks.length > 0 ? purchasedBooks : accountLibrary.concat(wishlistBooks);
  }, [resolvedOrders, wishlistItems]);

  if (!isAuthenticated) {
    return (
      <main className="min-h-screen bg-[var(--bookshop-bg)] py-8">
        <div className="mx-auto w-11/12 rounded-3xl border border-slate-200 border-l-8 border-l-emerald-600 bg-white px-8 py-7 text-center shadow-sm sm:w-10/12 sm:px-10 lg:w-4/5 dark:border-slate-700 dark:border-l-emerald-500 dark:bg-slate-900">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-violet-700">Reader access</p>
          <h2 className="mt-4 text-3xl font-semibold text-slate-900">Sign in to see your library</h2>
          <p className="mt-4 text-slate-600">
            Once authenticated, this view will show your saved books, current reading progress, and personalized recommendations.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/auth" className="bookshop-button-primary px-5 py-2.5 text-sm">
              Sign in to continue
            </Link>
            <Link href="/books" className="bookshop-button-quiet px-5 py-2.5 text-sm">
              Browse the catalog
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--bookshop-bg)]">
      <div className="mx-auto w-11/12 py-8 sm:w-10/12 lg:w-4/5">
        <div className="mb-6 flex justify-end">
          <Link href="/account" className="text-sm font-semibold text-emerald-700 hover:text-emerald-800 dark:text-emerald-300">
            Back to account dashboard
          </Link>
        </div>

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {libraryItems.map((book) => (
            <div key={book.id} className="rounded-3xl border border-slate-200 border-l-8 border-l-emerald-600 bg-white px-8 py-7 shadow-sm dark:border-slate-700 dark:border-l-emerald-500 dark:bg-slate-900">
              <div className="relative mb-5 h-48 overflow-hidden rounded-[1.25rem]">
                <Image src={book.cover} alt={book.title} fill className="object-cover" />
              </div>
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{book.status}</p>
                <h2 className="text-xl font-semibold text-slate-900">{book.title}</h2>
                <p className="text-sm text-slate-600">{book.author}</p>
                {book.progress ? <p className="text-sm text-slate-500">{book.progress}</p> : null}
                {readingProgressByBook[book.id] !== undefined ? (
                  <p className="text-sm text-violet-700">Reading progress: {readingProgressByBook[book.id]}%</p>
                ) : null}
                <div className="pt-2">
                  <Link
                    href={`/books/${book.id}`}
                    className="bookshop-button-quiet px-3 py-1 text-xs"
                  >
                    {readingProgressByBook[book.id] !== undefined ? 'Continue reading' : 'Start reading'}
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
