'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAccount } from '@/src/context/AccountContext';
import { getRecentActivities } from '@/src/data/studio';
import WriterStatsPanel from '@/src/components/studio/WriterStatsPanel';
import WriterBooksList from '@/src/components/studio/WriterBooksList';
import WriterActivityFeed from '@/src/components/studio/WriterActivityFeed';
import DisplaySection from '@/src/components/layout/DisplaySection';
import type { Book } from '@/src/types/book';
import type { WriterBook } from '@/src/types/studio';

export default function WriterStudioPage() {
  const { isAuthenticated, hasRole } = useAccount();
  const [books, setBooks] = useState<WriterBook[]>([]);
  const activities = getRecentActivities();

  useEffect(() => {
    if (!isAuthenticated || !hasRole('writer')) {
      return;
    }

    const loadBooks = async () => {
      try {
        const response = await fetch('/api/books?includeDrafts=true');
        const data = await response.json();
        const normalizedBooks = (Array.isArray(data) ? data : []).map((book: Book, index: number) => ({
          id: book.id,
          title: book.title,
          genre: book.genre,
          publishedDate: book.status === 'published' ? 'Published today' : book.status === 'archived' ? 'Archived' : 'Draft in progress',
          views: 1200 + index * 260 + (book.rating > 0 ? 150 : 0),
          sales: 40 + index * 12 + (book.status === 'published' ? 20 : 0),
          rating: book.rating,
          reviews: book.reviews,
          status: (book.status ?? 'published') as WriterBook['status'],
          cover: book.cover,
        }));

        setBooks(normalizedBooks);
      } catch {
        setBooks([]);
      }
    };

    void loadBooks();
  }, [hasRole, isAuthenticated]);

  const stats = useMemo(() => {
    const totalViews = books.reduce((sum, book) => sum + book.views, 0);
    const totalSales = books.reduce((sum, book) => sum + book.sales, 0);
    const avgRating = books.length > 0
      ? books.reduce((sum, book) => sum + book.rating, 0) / books.length
      : 0;

    return {
      totalBooks: books.length,
      totalViews,
      totalSales,
      avgRating,
      viewsGrowth: 23.5,
      salesGrowth: 18.2,
    };
  }, [books]);

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

      const updatedBook = (await response.json()) as Book;
      setBooks((currentBooks) => currentBooks.map((book) => (book.id === updatedBook.id ? {
        ...book,
        status: (updatedBook.status ?? 'published') as WriterBook['status'],
        publishedDate: updatedBook.status === 'published' ? 'Published today' : updatedBook.status === 'archived' ? 'Archived' : 'Draft in progress',
      } : book)));
    } catch {
      setBooks((currentBooks) => currentBooks);
    }
  };

  const handleDelete = async (bookId: string) => {
    try {
      const response = await fetch(`/api/books/${bookId}`, { method: 'DELETE' });
      if (!response.ok) {
        throw new Error('Unable to delete book.');
      }
      setBooks((currentBooks) => currentBooks.filter((book) => book.id !== bookId));
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
            description="Writer Back Office is available to accounts with writer access."
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
          description="A summary of your books, readership, sales and ratings."
        >
          <WriterStatsPanel stats={stats} />
        </DisplaySection>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
          <DisplaySection
            title="My books"
            description="Review your catalogue and update the publishing status of each title."
          >
            <div className="mb-5 flex justify-end">
              <select className="bookshop-input max-w-48">
                <option>All books</option>
                <option>Published</option>
                <option>Drafts</option>
                <option>Archived</option>
              </select>
            </div>
            <WriterBooksList books={books} onStatusChange={handleStatusChange} onDelete={handleDelete} />
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
          description="Common Writer Back Office tasks."
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <button className="bookshop-subcard p-4 text-center transition hover:bg-[var(--bookshop-accent-soft)]">
              <div className="mb-2 text-2xl">ðŸ“</div>
              <p className="font-medium text-[var(--bookshop-text)]">Write book</p>
            </button>
            <button className="bookshop-subcard p-4 text-center transition hover:bg-[var(--bookshop-accent-soft)]">
              <div className="mb-2 text-2xl">ðŸ“Š</div>
              <p className="font-medium text-[var(--bookshop-text)]">View analytics</p>
            </button>
            <button className="bookshop-subcard p-4 text-center transition hover:bg-[var(--bookshop-accent-soft)]">
              <div className="mb-2 text-2xl">ðŸ’¬</div>
              <p className="font-medium text-[var(--bookshop-text)]">Reader reviews</p>
            </button>
            <button className="bookshop-subcard p-4 text-center transition hover:bg-[var(--bookshop-accent-soft)]">
              <div className="mb-2 text-2xl">âš™ï¸</div>
              <p className="font-medium text-[var(--bookshop-text)]">Settings</p>
            </button>
          </div>
        </DisplaySection>
      </div>
    </main>
  );
}


