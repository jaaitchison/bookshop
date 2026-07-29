'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { useCart } from '../../context/CartContext';
import type { Book } from '../../types/book';

interface BookDetailProps {
  book: Book;
  relatedBooks: Book[];
}

export const BookDetail: React.FC<BookDetailProps> = ({ book, relatedBooks }) => {
  const { addItem } = useCart();
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [isUpdatingWishlist, setIsUpdatingWishlist] = useState(false);

  useEffect(() => {
    const loadWishlistState = async () => {
      try {
        const response = await fetch('/api/wishlist');
        const data = (await response.json()) as { items?: string[] };
        setIsWishlisted((data.items ?? []).includes(book.id));
      } catch {
        setIsWishlisted(false);
      }
    };

    void loadWishlistState();
  }, [book.id]);

  const handleWishlistToggle = async () => {
    const nextValue = !isWishlisted;
    setIsWishlisted(nextValue);
    setIsUpdatingWishlist(true);

    try {
      await fetch('/api/wishlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookId: book.id, action: nextValue ? 'add' : 'remove' }),
      });
    } catch {
      setIsWishlisted(!nextValue);
    } finally {
      setIsUpdatingWishlist(false);
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <Link
          href="/books"
          className="inline-flex items-center text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline mb-8"
        >
          ← Back to books
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-[320px,1fr] gap-10">
          <div className="flex justify-center lg:justify-start">
            <div className="relative w-full max-w-[320px] aspect-[3/4] overflow-hidden rounded-2xl bg-gray-200 dark:bg-gray-800 shadow-lg">
              <Image
                src={book.cover}
                alt={book.title}
                fill
                className="object-cover"
                priority
              />
            </div>
          </div>

          <div className="space-y-8">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                  {book.genre}
                </span>
                {book.new && (
                  <span className="inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-800 dark:bg-green-900/30 dark:text-green-300">
                    New release
                  </span>
                )}
              </div>

              <div>
                <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100">{book.title}</h1>
                <p className="mt-2 text-xl text-gray-600 dark:text-gray-400">by {book.author}</p>
              </div>

              <div className="flex flex-wrap items-center gap-6">
                <div className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                  ${book.price.toFixed(2)}
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <span className="text-yellow-500">★</span>
                  <span className="font-semibold text-gray-900 dark:text-gray-100">{book.rating}</span>
                  <span>({book.reviews.toLocaleString()} reviews)</span>
                </div>
              </div>

              <p className="text-lg leading-8 text-gray-700 dark:text-gray-300">{book.description}</p>
            </div>

            <div className="flex flex-wrap gap-4">
              <button
                onClick={() => addItem(book)}
                className="rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700"
              >
                Add to cart
              </button>
              <button
                onClick={handleWishlistToggle}
                disabled={isUpdatingWishlist}
                className={`rounded-lg border px-6 py-3 font-semibold transition ${
                  isWishlisted
                    ? 'border-amber-400 bg-amber-50 text-amber-700 dark:border-amber-500 dark:bg-amber-950/40 dark:text-amber-200'
                    : 'border-gray-300 text-gray-900 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                {isUpdatingWishlist ? 'Updating...' : isWishlisted ? 'Saved to wishlist' : 'Add to wishlist'}
              </button>
            </div>

            <div className="grid gap-4 rounded-2xl border border-gray-200 bg-gray-50 p-6 dark:border-gray-700 dark:bg-gray-800/60 md:grid-cols-3">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Format</p>
                <p className="mt-1 font-semibold text-gray-900 dark:text-gray-100">Paperback</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Publisher</p>
                <p className="mt-1 font-semibold text-gray-900 dark:text-gray-100">bookshop Press</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Shipping</p>
                <p className="mt-1 font-semibold text-gray-900 dark:text-gray-100">Free over $25</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-16">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">You may also like</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {relatedBooks.map((relatedBook) => (
              <Link key={relatedBook.id} href={`/books/${relatedBook.id}`} className="group">
                <div className="overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800">
                  <div className="relative aspect-[3/4]">
                    <Image src={relatedBook.cover} alt={relatedBook.title} fill className="object-cover transition group-hover:scale-105" />
                  </div>
                </div>
                <div className="mt-4">
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100">{relatedBook.title}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{relatedBook.author}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookDetail;
