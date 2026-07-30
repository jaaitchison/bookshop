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
      <main className="min-h-screen bg-gray-50 px-4 py-16 dark:bg-gray-950 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl rounded-3xl border border-gray-200 bg-white p-10 text-center shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-blue-600 dark:text-blue-400">Creator access required</p>
          <h1 className="mt-4 text-3xl font-semibold text-gray-900 dark:text-white">Writer Studio is available for verified creators</h1>
          <p className="mt-4 text-gray-600 dark:text-gray-400">
            Enable creator mode in your account dashboard to access the studio and manage your books.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/account" className="rounded-full bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700">
              Go to account dashboard
            </Link>
            <Link href="/books" className="rounded-full border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-100 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800">
              Continue browsing books
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100">
                Writer Studio
              </h1>
              <p className="text-lg text-gray-600 dark:text-gray-400 mt-2">
                Manage your books, track sales, and engage with readers
              </p>
            </div>
            <button className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors">
              + Publish New Book
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-12">
          <WriterStatsPanel stats={stats} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="mb-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  My Books
                </h2>
                <div className="flex gap-3">
                  <select className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm">
                    <option>All Books</option>
                    <option>Published</option>
                    <option>Drafts</option>
                    <option>Archived</option>
                  </select>
                </div>
              </div>
            </div>
            <WriterBooksList books={books} onStatusChange={handleStatusChange} onDelete={handleDelete} />
          </div>

          <div className="lg:col-span-1">
            <WriterActivityFeed activities={activities} />
          </div>
        </div>

        <div className="mt-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-6">
            Quick Actions
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <button className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors text-center">
              <div className="text-2xl mb-2">📝</div>
              <p className="font-medium text-gray-900 dark:text-gray-100">Write Book</p>
            </button>
            <button className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors text-center">
              <div className="text-2xl mb-2">📊</div>
              <p className="font-medium text-gray-900 dark:text-gray-100">View Analytics</p>
            </button>
            <button className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors text-center">
              <div className="text-2xl mb-2">💬</div>
              <p className="font-medium text-gray-900 dark:text-gray-100">Reader Reviews</p>
            </button>
            <button className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors text-center">
              <div className="text-2xl mb-2">⚙️</div>
              <p className="font-medium text-gray-900 dark:text-gray-100">Settings</p>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
