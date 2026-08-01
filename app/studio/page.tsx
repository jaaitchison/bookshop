'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAccount } from '@/src/context/AccountContext';
import { getRecentActivities } from '@/src/data/studio';
import WriterStatsPanel from '@/src/components/studio/WriterStatsPanel';
import WriterBooksList from '@/src/components/studio/WriterBooksList';
import WriterActivityFeed from '@/src/components/studio/WriterActivityFeed';
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
      <main className="min-h-screen bg-[var(--bookshop-bg)] px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl rounded-[2rem] border border-[var(--bookshop-border)] bg-[var(--bookshop-surface)] p-10 text-center shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-violet-700">Creator access required</p>
          <h1 className="mt-4 text-3xl font-semibold text-slate-900">Writer Studio is available for verified creators</h1>
          <p className="mt-4 text-slate-600">
            Enable creator mode in your account dashboard to access the studio and manage your books.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/account" className="bookshop-button-primary px-5 py-2.5 text-sm">
              Go to account dashboard
            </Link>
            <Link href="/books" className="bookshop-button-quiet px-5 py-2.5 text-sm">
              Continue browsing books
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bookshop-bg)]">
      <div className="border-b border-[var(--bookshop-border)] bg-[var(--bookshop-surface)]">
        <div className="bookshop-shell py-12">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-violet-700">Writer Studio</p>
              <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900">Writer Studio</h1>
              <p className="mt-2 text-base text-slate-600">Manage your books, track sales, and engage with readers.</p>
            </div>
            <button className="bookshop-button-primary px-6 py-3 text-sm">
              + Publish new book
            </button>
          </div>
        </div>
      </div>

      <div className="bookshop-shell py-12">
        <div className="mb-12">
          <WriterStatsPanel stats={stats} />
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-slate-900">My books</h2>
              <select className="rounded-full border border-[var(--bookshop-border)] bg-white px-4 py-2 text-sm text-slate-700">
                <option>All books</option>
                <option>Published</option>
                <option>Drafts</option>
                <option>Archived</option>
              </select>
            </div>
            <WriterBooksList books={books} onStatusChange={handleStatusChange} onDelete={handleDelete} />
          </div>

          <div className="lg:col-span-1">
            <WriterActivityFeed activities={activities} />
          </div>
        </div>

        <div className="mt-12 rounded-[2rem] border border-[var(--bookshop-border)] bg-[var(--bookshop-surface)] p-8 shadow-sm">
          <h2 className="mb-6 text-xl font-bold text-slate-900">Quick actions</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <button className="bookshop-subcard p-4 text-center transition hover:bg-violet-50">
              <div className="mb-2 text-2xl">📝</div>
              <p className="font-medium text-slate-900">Write book</p>
            </button>
            <button className="bookshop-subcard p-4 text-center transition hover:bg-violet-50">
              <div className="mb-2 text-2xl">📊</div>
              <p className="font-medium text-slate-900">View analytics</p>
            </button>
            <button className="bookshop-subcard p-4 text-center transition hover:bg-violet-50">
              <div className="mb-2 text-2xl">💬</div>
              <p className="font-medium text-slate-900">Reader reviews</p>
            </button>
            <button className="bookshop-subcard p-4 text-center transition hover:bg-violet-50">
              <div className="mb-2 text-2xl">⚙️</div>
              <p className="font-medium text-slate-900">Settings</p>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
