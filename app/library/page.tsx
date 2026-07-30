'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useAccount } from '@/src/context/AccountContext';
import { accountLibrary } from '@/src/data/account';
import { mockBooks } from '@/src/data/books';

export default function LibraryPage() {
  const { isAuthenticated, orders } = useAccount();
  const [wishlistItems, setWishlistItems] = useState<string[]>([]);

  useEffect(() => {
    const loadWishlist = async () => {
      try {
        const response = await fetch('/api/wishlist');
        const data = await response.json() as { items?: string[] };
        setWishlistItems(data.items ?? []);
      } catch {
        setWishlistItems([]);
      }
    };

    void loadWishlist();
  }, []);

  const libraryItems = useMemo(() => {
    const purchased = orders.flatMap((order) => order.items).reduce<Record<string, typeof accountLibrary[number]>>((acc, item) => {
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
  }, [orders, wishlistItems]);

  if (!isAuthenticated) {
    return (
      <main className="min-h-screen bg-gray-50 px-4 py-16 dark:bg-gray-950 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl rounded-3xl border border-gray-200 bg-white p-10 text-center shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-blue-600 dark:text-blue-400">Reader access</p>
          <h1 className="mt-4 text-3xl font-semibold text-gray-900 dark:text-white">Sign in to see your library</h1>
          <p className="mt-4 text-gray-600 dark:text-gray-400">
            Once authenticated, this view will show your saved books, current reading progress, and personalized recommendations.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/auth" className="rounded-full bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700">
              Sign in to continue
            </Link>
            <Link href="/books" className="rounded-full border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-100 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800">
              Browse the catalog
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-blue-600 dark:text-blue-400">
              Unified account
            </p>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">My library</h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              A reader-first view of your acquired and saved books. Your purchases and wishlist appear here when available.
            </p>
          </div>
          <Link href="/account" className="text-sm font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400">
            Back to account dashboard
          </Link>
        </div>

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {libraryItems.map((book) => (
            <div key={book.id} className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <div className="relative mb-5 h-48 overflow-hidden rounded-2xl">
                <Image src={book.cover} alt={book.title} fill className="object-cover" />
              </div>
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400">
                  {book.status}
                </p>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{book.title}</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">{book.author}</p>
                {book.progress ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400">{book.progress}</p>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
