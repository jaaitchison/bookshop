'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAccount } from '@/src/context/AccountContext';
import { getRecentActivities } from '@/src/data/studio';
import WriterStatsPanel from '@/src/components/studio/WriterStatsPanel';
import WriterSalesBreakdown from '@/src/components/studio/WriterSalesBreakdown';
import WriterBooksList from '@/src/components/studio/WriterBooksList';
import WriterActivityFeed from '@/src/components/studio/WriterActivityFeed';
import DisplaySection from '@/src/components/layout/DisplaySection';
import type { WriterBook, WriterSalesAnalytics } from '@/src/types/studio';
type WriterStudioApiBook = {
  id: string;
  title: string;
  genre: string;
  coverUrl: string;
  rating: number;
  reviews: number;
  status: WriterBook['status'];
  moderationReason: string;
};

const STATUS_LABELS: Record<WriterBook['status'], string> = {
  draft: 'Draft in progress',
  in_review: 'Awaiting Admin review',
  changes_requested: 'Changes requested',
  approved: 'Approved',
  published: 'Published',
  archived: 'Archived',
};

const EMPTY_SALES: WriterSalesAnalytics = {
  currency: 'GBP',
  totalBooksSold: 0,
  totalRevenue: 0,
  books: [],
};

export default function WriterStudioPage() {
  const { isAuthenticated, hasRole } = useAccount();
  const [books, setBooks] = useState<WriterBook[]>([]);
  const [sales, setSales] = useState<WriterSalesAnalytics>(EMPTY_SALES);
  const activities = getRecentActivities();

  useEffect(() => {
    if (!isAuthenticated || !hasRole('writer')) {
      return;
    }

    const loadBooks = async () => {
      try {
        const [booksResponse, salesResponse] = await Promise.all([
          fetch('/api/studio/books', {
            credentials: 'include',
            cache: 'no-store',
          }),
          fetch('/api/studio/sales', {
            credentials: 'include',
            cache: 'no-store',
          }),
        ]);

        if (!booksResponse.ok || !salesResponse.ok) {
          throw new Error('Unable to load Writer Studio data.');
        }

        const data = (await booksResponse.json()) as {
          books?: WriterStudioApiBook[];
        };
        const salesData = (await salesResponse.json()) as {
          sales?: WriterSalesAnalytics;
        };
        const nextSales = salesData.sales ?? EMPTY_SALES;
        const salesByBook = new Map(nextSales.books.map((book) => [book.bookId, book.booksSold]));

        const normalizedBooks = (data.books ?? []).map((book) => ({
          id: book.id,
          title: book.title,
          genre: book.genre,
          publishedDate: STATUS_LABELS[book.status],
          views: 0,
          sales: salesByBook.get(book.id) ?? 0,
          rating: book.rating,
          reviews: book.reviews,
          status: book.status,
          cover: book.coverUrl,
          moderationReason: book.moderationReason,
        }));

        setBooks(normalizedBooks);
        setSales(nextSales);
      } catch {
        setBooks([]);
        setSales(EMPTY_SALES);
      }
    };

    void loadBooks();
  }, [hasRole, isAuthenticated]);

  const stats = useMemo(() => {
    const avgRating = books.length > 0
      ? books.reduce((sum, book) => sum + book.rating, 0) / books.length
      : 0;

    return {
      totalBooks: books.length,
      publishedBooks: sales.books.length,
      totalBooksSold: sales.totalBooksSold,
      totalRevenue: sales.totalRevenue,
      avgRating,
    };
  }, [books, sales]);

  const handleStatusChange = async (bookId: string, status: WriterBook['status']) => {
    try {
      const response = await fetch(`/api/books/${bookId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        throw new Error('Unable to update book status.');
      }

      const updatedBook = (await response.json()) as WriterStudioApiBook;
      setBooks((currentBooks) => currentBooks.map((book) => (book.id === updatedBook.id ? {
        ...book,
        status: updatedBook.status ?? 'draft',
        publishedDate: STATUS_LABELS[updatedBook.status ?? 'draft'],
        moderationReason: updatedBook.moderationReason ?? book.moderationReason,
      } : book)));
    } catch {
      setBooks((currentBooks) => currentBooks);
    }
  };

  if (!isAuthenticated || !hasRole('writer')) {
    return (
      <main className="bg-[var(--bookshop-bg)]">
        <div className="mx-auto w-11/12 py-8 pb-12 sm:w-10/12 sm:pb-16 lg:w-4/5">
          <DisplaySection
            title="Creator access required"
            description="Back of House is available to accounts with Writer access."
          >
            <div className="py-4 text-center">
              <p className="mx-auto max-w-2xl text-[var(--bookshop-muted)]">
                Enable creator mode in your account dashboard to access publishing tools and manage your books.
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <Link href="/account" className="bookshop-button-primary px-5 py-2.5 text-sm">
                  Go to account dashboard
                </Link>
                <Link href="/books" className="bookshop-button-quiet px-5 py-2.5 text-sm">
                  Continue browsing books
                </Link>
              </div>
            </div>
          </DisplaySection>
        </div>
      </main>
    );
  }

  return (
    <main className="bg-[var(--bookshop-bg)]">
      <div className="mx-auto w-11/12 space-y-8 py-8 pb-12 sm:w-10/12 sm:pb-16 lg:w-4/5">
        <DisplaySection
          title="Publishing overview"
          description="A live summary of your published catalogue and completed sales."
        >
          <WriterStatsPanel stats={stats} />
        </DisplaySection>

        <DisplaySection
          title="Sales by published book"
          description="Completed, non-refunded order items for books owned by your Writer account."
        >
          <WriterSalesBreakdown sales={sales} />
        </DisplaySection>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
          <DisplaySection
            title="My books"
            description="Develop your catalogue, submit completed books for Admin review and respond to feedback."
          >
            <div className="mb-5 flex justify-end">
              <select className="bookshop-input max-w-48">
                <option>All books</option>
                <option>Published</option>
                <option>Drafts</option>
                <option>In review</option>
                <option>Changes requested</option>
                <option>Archived</option>
              </select>
            </div>
            <WriterBooksList books={books} onStatusChange={handleStatusChange} />
          </DisplaySection>

          <DisplaySection
            title="Recent activity"
            description="Latest publishing, sales and reader activity."
          >
            <WriterActivityFeed activities={activities} />
          </DisplaySection>
        </div>

        <DisplaySection
          title="Quick actions"
          description="Common Back of House tasks."
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Link
              href="/studio/new"
              className="bookshop-subcard p-4 text-center transition hover:bg-[var(--bookshop-accent-soft)]"
            >
              <div className="mb-2 text-2xl" aria-hidden="true">+</div>
              <p className="font-medium text-[var(--bookshop-text)]">Write book</p>
            </Link>
            <button className="bookshop-subcard p-4 text-center transition hover:bg-[var(--bookshop-accent-soft)]">
              <div className="mb-2 text-2xl">Ã°Å¸â€œÅ </div>
              <p className="font-medium text-[var(--bookshop-text)]">View analytics</p>
            </button>
            <button className="bookshop-subcard p-4 text-center transition hover:bg-[var(--bookshop-accent-soft)]">
              <div className="mb-2 text-2xl">Ã°Å¸â€™Â¬</div>
              <p className="font-medium text-[var(--bookshop-text)]">Reader reviews</p>
            </button>
            <button className="bookshop-subcard p-4 text-center transition hover:bg-[var(--bookshop-accent-soft)]">
              <div className="mb-2 text-2xl">Ã¢Å¡â„¢Ã¯Â¸Â</div>
              <p className="font-medium text-[var(--bookshop-text)]">Settings</p>
            </button>
          </div>
        </DisplaySection>
      </div>
    </main>
  );
}


