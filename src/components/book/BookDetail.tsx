'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState, type FormEvent } from 'react';
import { useCart } from '../../context/CartContext';
import type { Book, BookReview } from '../../types/book';

interface BookDetailProps {
  book: Book;
  relatedBooks: Book[];
}

export const BookDetail: React.FC<BookDetailProps> = ({ book, relatedBooks }) => {
  const { addItem } = useCart();
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [isUpdatingWishlist, setIsUpdatingWishlist] = useState(false);
  const [reviews, setReviews] = useState<BookReview[]>([]);
  const [reviewForm, setReviewForm] = useState({ user: '', rating: 5, comment: '' });
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

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

    const loadReviews = async () => {
      try {
        const response = await fetch(`/api/books/${book.id}/reviews`);
        const nextReviews = (await response.json()) as BookReview[];
        setReviews(nextReviews);
      } catch {
        setReviews([]);
      }
    };

    void loadWishlistState();
    void loadReviews();
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

  const handleSubmitReview = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!reviewForm.user.trim() || !reviewForm.comment.trim()) {
      return;
    }

    setIsSubmittingReview(true);

    try {
      const response = await fetch(`/api/books/${book.id}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user: reviewForm.user,
          rating: reviewForm.rating,
          comment: reviewForm.comment,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit review');
      }

      const nextReviews = (await response.json()) as BookReview[];
      setReviews(nextReviews);
      setReviewForm({ user: '', rating: 5, comment: '' });
    } catch {
      // Keep the form intact on failure.
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const averageReviewScore = reviews.length > 0
    ? (reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length).toFixed(1)
    : book.rating.toFixed(1);

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

        <div className="mt-16 rounded-3xl border border-gray-200 bg-gray-50 p-8 dark:border-gray-700 dark:bg-gray-800/60">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-600 dark:text-blue-400">Reader voices</p>
              <h2 className="mt-2 text-2xl font-bold text-gray-900 dark:text-gray-100">Reviews from your community</h2>
            </div>
            <div className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm dark:bg-gray-900 dark:text-gray-200">
              {reviews.length} review{reviews.length === 1 ? '' : 's'} • {averageReviewScore}/5 avg
            </div>
          </div>

          <div className="mt-8 grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-4">
              {reviews.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-gray-300 p-6 text-sm text-gray-600 dark:border-gray-600 dark:text-gray-300">
                  No reviews yet. Be the first to share what you thought about this book.
                </div>
              ) : (
                reviews.map((review) => (
                  <div key={review.id} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-semibold text-gray-900 dark:text-gray-100">{review.user}</p>
                      <div className="text-sm font-semibold text-amber-600 dark:text-amber-300">{'★'.repeat(review.rating)}</div>
                    </div>
                    <p className="mt-3 text-sm leading-7 text-gray-700 dark:text-gray-300">{review.comment}</p>
                    <p className="mt-3 text-xs uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400">
                      {new Date(review.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                ))
              )}
            </div>

            <form onSubmit={handleSubmitReview} className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Write a review</h3>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Share a quick note so future readers know what to expect.</p>

              <label className="mt-6 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Your name
                <input
                  value={reviewForm.user}
                  onChange={(event) => setReviewForm((current) => ({ ...current, user: event.target.value }))}
                  className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none ring-0 focus:border-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                  placeholder="Maya"
                />
              </label>

              <label className="mt-4 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Rating
                <select
                  value={reviewForm.rating}
                  onChange={(event) => setReviewForm((current) => ({ ...current, rating: Number(event.target.value) }))}
                  className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none focus:border-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                >
                  {[5, 4, 3, 2, 1].map((value) => (
                    <option key={value} value={value}>{value} star{value === 1 ? '' : 's'}</option>
                  ))}
                </select>
              </label>

              <label className="mt-4 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Comment
                <textarea
                  value={reviewForm.comment}
                  onChange={(event) => setReviewForm((current) => ({ ...current, comment: event.target.value }))}
                  rows={4}
                  className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none focus:border-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                  placeholder="What stood out to you?"
                />
              </label>

              <button
                type="submit"
                disabled={isSubmittingReview}
                className="mt-6 rounded-full bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSubmittingReview ? 'Posting review...' : 'Post review'}
              </button>
            </form>
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
