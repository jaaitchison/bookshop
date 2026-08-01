'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useCart } from '../../context/CartContext';
import { useAccount } from '../../context/AccountContext';
import type { Book, BookChapter, BookReview } from '../../types/book';

interface BookDetailProps {
  book: Book;
  relatedBooks: Book[];
}

export const BookDetail: React.FC<BookDetailProps> = ({ book, relatedBooks }) => {
  const { addItem } = useCart();
  const { isAuthenticated, orders, hasRole } = useAccount();
  const readingStorageKey = `bookshop-reading-progress-${book.id}`;
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [isUpdatingWishlist, setIsUpdatingWishlist] = useState(false);
  const [reviews, setReviews] = useState<BookReview[]>([]);
  const [reviewForm, setReviewForm] = useState({ user: '', rating: 5, comment: '' });
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [activeChapterId, setActiveChapterId] = useState<string | null>(() => {
    if (typeof window === 'undefined') {
      return null;
    }

    try {
      const savedProgress = window.localStorage.getItem(readingStorageKey);
      if (!savedProgress) {
        return null;
      }
      const parsed = JSON.parse(savedProgress) as { chapterId?: string };
      return typeof parsed.chapterId === 'string' ? parsed.chapterId : null;
    } catch {
      window.localStorage.removeItem(readingStorageKey);
      return null;
    }
  });
  const [scrollProgress, setScrollProgress] = useState<number>(() => {
    if (typeof window === 'undefined') {
      return 0;
    }

    try {
      const savedProgress = window.localStorage.getItem(readingStorageKey);
      if (!savedProgress) {
        return 0;
      }
      const parsed = JSON.parse(savedProgress) as { progress?: number };
      return typeof parsed.progress === 'number' && parsed.progress >= 0 && parsed.progress <= 100 ? parsed.progress : 0;
    } catch {
      return 0;
    }
  });

  const chapters = useMemo<BookChapter[]>(() => {
    if (book.manuscriptChapters && book.manuscriptChapters.length > 0) {
      return book.manuscriptChapters;
    }

    return [
      {
        id: `${book.id}-preview`,
        title: 'Sample Chapter',
        content: `This is a free preview of "${book.title}".\n\nThe morning arrived quiet and bright, and everything felt possible. The first pages of this story invite you into the world, introduce the voice, and set the stakes for what is to come.`,
        isPreview: true,
      },
      {
        id: `${book.id}-chapter-2`,
        title: 'Chapter 2',
        content: `Full manuscript content for "${book.title}" unlocks instantly after purchase.\n\nChapter 2 deepens the conflict, reveals character motivations, and expands the world with details unavailable in the public preview.`,
        isPreview: false,
      },
      {
        id: `${book.id}-chapter-3`,
        title: 'Chapter 3',
        content: `Readers with access can continue seamlessly across chapters with progress sync.\n\nThis chapter advances the narrative arc and sets up pivotal decisions.`,
        isPreview: false,
      },
    ];
  }, [book.id, book.manuscriptChapters, book.title]);

  const purchasedBookIds = useMemo(
    () => new Set(orders.flatMap((order) => order.items.map((item) => item.id))),
    [orders],
  );
  const canAccessFullManuscript = hasRole('writer') || hasRole('admin') || purchasedBookIds.has(book.id);
  const readableChapters = canAccessFullManuscript ? chapters : chapters.filter((chapter) => chapter.isPreview);
  const activeChapter = readableChapters.find((chapter) => chapter.id === activeChapterId) ?? readableChapters[0];

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

  useEffect(() => {
    if (typeof window === 'undefined' || !isAuthenticated || !activeChapter) {
      return;
    }

    window.localStorage.setItem(
      readingStorageKey,
      JSON.stringify({
        chapterId: activeChapter.id,
        progress: scrollProgress,
      }),
    );
  }, [activeChapter, isAuthenticated, readingStorageKey, scrollProgress]);

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
    setReviewError(null);
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
        if (response.status === 403) {
          setReviewError('Only purchasers can post reviews for this book.');
          return;
        }
        throw new Error('Failed to submit review');
      }

      const nextReviews = (await response.json()) as BookReview[];
      setReviews(nextReviews);
      setReviewForm({ user: '', rating: 5, comment: '' });
    } catch {
      setReviewError('Unable to post review right now.');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const averageReviewScore = reviews.length > 0
    ? (reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length).toFixed(1)
    : book.rating.toFixed(1);

  return (
    <div className="min-h-screen bg-[var(--bookshop-bg)]">
      <div className="mx-auto w-11/12 py-8 sm:w-10/12 lg:w-4/5">
        <Link href="/books" className="mb-8 inline-flex items-center text-sm font-medium text-violet-700 hover:text-violet-800">
          Ã¢â€ Â Back to books
        </Link>

        <div className="grid gap-6 lg:grid-cols-[300px,1fr]">
          <div className="flex justify-center lg:justify-start">
            <div className="relative aspect-[3/4] w-full max-w-[320px] overflow-hidden rounded-[1.75rem] border border-[var(--bookshop-border)] bg-[var(--bookshop-surface)] shadow-sm">
              <Image src={book.cover} alt={book.title} fill className="object-cover" priority />
            </div>
          </div>

          <div className="space-y-6">
          <div className="space-y-4 rounded-[2rem] border border-[var(--bookshop-border)] bg-[var(--bookshop-surface)] p-6 shadow-sm">
              <div className="flex flex-wrap items-center gap-3">
                <span className="rounded-full bg-violet-100 px-3 py-1 text-sm font-medium text-violet-800">{book.genre}</span>
                {book.new ? <span className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-medium text-emerald-800">New release</span> : null}
              </div>

              <div>
                <h1 className="text-3xl font-black tracking-tight text-slate-900">{book.title}</h1>
                <p className="mt-2 text-lg text-slate-600">by {book.author}</p>
              </div>

              <div className="flex flex-wrap items-center gap-6">
                <div className="text-3xl font-bold text-slate-900">${book.price.toFixed(2)}</div>
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <span className="text-amber-500">Ã¢Ëœâ€¦</span>
                  <span className="font-semibold text-slate-900">{book.rating}</span>
                  <span>({book.reviews.toLocaleString()} reviews)</span>
                </div>
              </div>

              <p className="text-base leading-8 text-slate-700">{book.description}</p>
            </div>

            <div className="flex flex-wrap gap-4">
              <button onClick={() => addItem(book)} className="bookshop-button-primary px-6 py-3">
                Add to cart
              </button>
              <button onClick={handleWishlistToggle} disabled={isUpdatingWishlist} className={`rounded-full border px-6 py-3 font-semibold transition ${isWishlisted ? 'border-amber-400 bg-amber-50 text-amber-700' : 'bookshop-button-quiet'}`}>
                {isUpdatingWishlist ? 'Updating...' : isWishlisted ? 'Saved to wishlist' : 'Add to wishlist'}
              </button>
              {!canAccessFullManuscript ? (
                <Link href={`/checkout?bookId=${encodeURIComponent(book.id)}`} className="bookshop-button-quiet px-6 py-3">
                  Unlock full manuscript
                </Link>
              ) : null}
            </div>

            <div className="grid gap-4 rounded-[2rem] border border-[var(--bookshop-border)] bg-[var(--bookshop-surface)] p-5 shadow-sm md:grid-cols-3">
              <div>
                <p className="text-sm font-medium text-slate-500">Format</p>
                <p className="mt-1 font-semibold text-slate-900">Paperback</p>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">Publisher</p>
                <p className="mt-1 font-semibold text-slate-900">bookshop Press</p>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">Shipping</p>
                <p className="mt-1 font-semibold text-slate-900">Free over $25</p>
              </div>
            </div>

            <div className="rounded-[2rem] border border-[var(--bookshop-border)] bg-[var(--bookshop-surface)] p-5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-700">Reader view</p>
                  <h2 className="text-xl font-semibold text-slate-900">{canAccessFullManuscript ? 'Full manuscript unlocked' : 'Preview chapter access'}</h2>
                </div>
                {!canAccessFullManuscript ? (
                  <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">Preview only</span>
                ) : (
                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">Full access</span>
                )}
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {readableChapters.map((chapter) => (
                  <button key={chapter.id} type="button" onClick={() => setActiveChapterId(chapter.id)} className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${chapter.id === activeChapter?.id ? 'border border-violet-200 bg-violet-50 text-violet-700' : 'border border-violet-200 text-violet-700 hover:bg-violet-50'}`}>
                    {chapter.title}
                  </button>
                ))}
              </div>

              <div className="mt-5 rounded-[1.25rem] border border-[var(--bookshop-border)] bg-slate-50 p-4">
                <h3 className="text-base font-semibold text-slate-900">{activeChapter?.title}</h3>
                <p className="mt-3 whitespace-pre-line text-sm leading-7 text-slate-700">{activeChapter?.content}</p>
              </div>

              {canAccessFullManuscript ? (
                <div className="mt-5">
                  <div className="flex items-center justify-between text-sm text-slate-600">
                    <span>Reading progress</span>
                    <span>{scrollProgress}%</span>
                  </div>
                  <input type="range" min={0} max={100} value={scrollProgress} onChange={(event) => setScrollProgress(Number(event.target.value))} className="mt-2 w-full" aria-label="Reading progress" />
                </div>
              ) : (
                <div className="mt-5 rounded-[1.25rem] border border-dashed border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
                  Purchase this book to unlock all chapters, synced progress, and full reader access in your library.
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-14 rounded-[2rem] border border-[var(--bookshop-border)] bg-[var(--bookshop-surface)] p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-violet-700">Reader voices</p>
              <h2 className="mt-2 text-2xl font-bold text-slate-900">Reviews from your community</h2>
            </div>
            <div className="rounded-full bg-violet-50 px-4 py-2 text-sm font-semibold text-violet-700">
              {reviews.length} review{reviews.length === 1 ? '' : 's'} Ã¢â‚¬Â¢ {averageReviewScore}/5 avg
            </div>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-4">
              {reviews.length === 0 ? (
                <div className="rounded-[1.5rem] border border-dashed border-[var(--bookshop-border)] p-6 text-sm text-slate-600">
                  No reviews yet. Be the first to share what you thought about this book.
                </div>
              ) : (
                reviews.map((review) => (
                  <div key={review.id} className="rounded-[1.5rem] border border-[var(--bookshop-border)] bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-semibold text-slate-900">{review.user}</p>
                      <div className="text-sm font-semibold text-amber-600">{'Ã¢Ëœâ€¦'.repeat(review.rating)}</div>
                    </div>
                    <p className="mt-3 text-sm leading-7 text-slate-700">{review.comment}</p>
                    <p className="mt-3 text-xs uppercase tracking-[0.2em] text-slate-500">{new Date(review.createdAt).toLocaleDateString()}</p>
                  </div>
                ))
              )}
            </div>

            <form onSubmit={handleSubmitReview} className="rounded-[1.5rem] border border-[var(--bookshop-border)] bg-white p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-900">Write a review</h3>
              <p className="mt-2 text-sm text-slate-600">Share a quick note so future readers know what to expect.</p>

              <label className="mt-6 block text-sm font-medium text-slate-700">
                Your name
                <input value={reviewForm.user} onChange={(event) => setReviewForm((current) => ({ ...current, user: event.target.value }))} className="mt-2 w-full rounded-2xl border border-[var(--bookshop-border)] bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-violet-400" placeholder="Maya" />
              </label>

              <label className="mt-4 block text-sm font-medium text-slate-700">
                Rating
                <select value={reviewForm.rating} onChange={(event) => setReviewForm((current) => ({ ...current, rating: Number(event.target.value) }))} className="mt-2 w-full rounded-2xl border border-[var(--bookshop-border)] bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-violet-400">
                  {[5, 4, 3, 2, 1].map((value) => (
                    <option key={value} value={value}>{value} star{value === 1 ? '' : 's'}</option>
                  ))}
                </select>
              </label>

              {reviewError ? <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{reviewError}</p> : null}

              <label className="mt-4 block text-sm font-medium text-slate-700">
                Comment
                <textarea value={reviewForm.comment} onChange={(event) => setReviewForm((current) => ({ ...current, comment: event.target.value }))} rows={4} className="mt-2 w-full rounded-2xl border border-[var(--bookshop-border)] bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-violet-400" placeholder="What stood out to you?" />
              </label>

              <button type="submit" disabled={isSubmittingReview} className="bookshop-button-primary mt-6 px-5 py-2.5 text-sm disabled:cursor-not-allowed disabled:opacity-70">
                {isSubmittingReview ? 'Posting review...' : 'Post review'}
              </button>
            </form>
          </div>
        </div>

        <div className="mt-14">
          <h2 className="mb-6 text-2xl font-bold text-slate-900">You may also like</h2>
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {relatedBooks.map((relatedBook) => (
              <Link key={relatedBook.id} href={`/books/${relatedBook.id}`} className="group rounded-[1.5rem] border border-[var(--bookshop-border)] bg-[var(--bookshop-surface)] p-3 shadow-sm transition hover:-translate-y-1">
                <div className="relative aspect-[3/4] overflow-hidden rounded-[1.15rem]">
                  <Image src={relatedBook.cover} alt={relatedBook.title} fill className="object-cover transition duration-300 group-hover:scale-105" />
                </div>
                <div className="mt-4">
                  <h3 className="font-semibold text-slate-900">{relatedBook.title}</h3>
                  <p className="text-sm text-slate-600">{relatedBook.author}</p>
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
