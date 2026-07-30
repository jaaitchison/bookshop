'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAccount } from '@/src/context/AccountContext';
import { getAdminStats, getRecentActivity } from '@/src/data/admin';
import AdminStatsPanel from '@/src/components/admin/AdminStatsPanel';
import ActivityFeed from '@/src/components/admin/ActivityFeed';
import { AdminAlert, AdminSection } from '@/src/components/admin/AdminComponents';
import type { Book } from '@/src/types/book';
import type { AdminStats } from '@/src/types/admin';

type BookStatus = NonNullable<Book['status']>;

const emptyForm = {
  title: '',
  author: '',
  genre: 'Fiction',
  price: '',
  description: '',
  status: 'draft' as BookStatus,
};

export default function AdminPage() {
  const { isAuthenticated, hasRole } = useAccount();
  const [books, setBooks] = useState<Book[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const baseStats = getAdminStats();
  const stats = useMemo<AdminStats>(() => ({
    ...baseStats,
    totalBooks: books.length,
    totalRevenue: books.reduce((sum, book) => sum + book.price * 120, 0),
  }), [baseStats, books]);
  const activities = getRecentActivity();

  useEffect(() => {
    if (!isAuthenticated || !hasRole('admin')) {
      return;
    }

    const loadBooks = async () => {
      try {
        const response = await fetch('/api/books?includeDrafts=true');
        const data = await response.json();
        setBooks(Array.isArray(data) ? data : []);
      } catch {
        setError('Unable to load catalog books right now.');
      }
    };

    void loadBooks();
  }, [hasRole, isAuthenticated]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);
    setError(null);

    const payload = {
      title: form.title.trim(),
      author: form.author.trim(),
      genre: form.genre,
      price: Number(form.price || 0),
      description: form.description.trim(),
      status: form.status,
    };

    if (!payload.title || !payload.author) {
      setError('Please provide a title and author for the book.');
      setIsSaving(false);
      return;
    }

    try {
      const response = await fetch(selectedBookId ? `/api/books/${selectedBookId}` : '/api/books', {
        method: selectedBookId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error('Unable to save the book.');
      }

      const nextBook = (await response.json()) as Book;
      setBooks((currentBooks) => {
        if (selectedBookId) {
          return currentBooks.map((book) => (book.id === nextBook.id ? nextBook : book));
        }

        return [nextBook, ...currentBooks];
      });
      setForm(emptyForm);
      setSelectedBookId(null);
    } catch {
      setError('Unable to save the book right now.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (book: Book) => {
    setSelectedBookId(book.id);
    setForm({
      title: book.title,
      author: book.author,
      genre: book.genre,
      price: String(book.price),
      description: book.description,
      status: book.status ?? 'draft',
    });
  };

  const handleStatusChange = async (bookId: string, status: BookStatus) => {
    try {
      const response = await fetch(`/api/books/${bookId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        throw new Error('Unable to update the book status.');
      }

      const updatedBook = (await response.json()) as Book;
      setBooks((currentBooks) => currentBooks.map((book) => (book.id === updatedBook.id ? updatedBook : book)));
    } catch {
      setError('Unable to update the book status right now.');
    }
  };

  const handleDelete = async (bookId: string) => {
    try {
      const response = await fetch(`/api/books/${bookId}`, { method: 'DELETE' });
      if (!response.ok) {
        throw new Error('Unable to delete the book.');
      }
      setBooks((currentBooks) => currentBooks.filter((book) => book.id !== bookId));
    } catch {
      setError('Unable to delete the book right now.');
    }
  };

  if (!isAuthenticated || !hasRole('admin')) {
    return (
      <main className="min-h-screen bg-gray-50 px-4 py-16 dark:bg-gray-950 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl rounded-3xl border border-gray-200 bg-white p-10 text-center shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-red-600 dark:text-red-400">Admin access required</p>
          <h1 className="mt-4 text-3xl font-semibold text-gray-900 dark:text-white">Admin Dashboard is restricted</h1>
          <p className="mt-4 text-gray-600 dark:text-gray-400">
            This area is only available to administrator accounts. Visit your dashboard to request access or continue browsing.
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
    <main className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white">Admin Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Manage your bookshop, users, and view analytics
          </p>
        </div>

        <div className="mb-8">
          <AdminAlert
            type="info"
            title="System Status"
            message="All systems operational. Last backup completed 2 hours ago."
          />
        </div>

        <AdminSection
          title="Key Metrics"
          description="Overview of your bookshop performance"
        >
          <AdminStatsPanel stats={stats} />
        </AdminSection>

        <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-8">
            <AdminSection title="Catalog Management" description="Create, update, and moderate books from a single workspace.">
              <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                <form className="space-y-4" onSubmit={handleSubmit}>
                  {error ? (
                    <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
                      {error}
                    </p>
                  ) : null}
                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      <span className="mb-1 block">Title</span>
                      <input
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                        value={form.title}
                        onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                        placeholder="Book title"
                      />
                    </label>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      <span className="mb-1 block">Author</span>
                      <input
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                        value={form.author}
                        onChange={(event) => setForm((current) => ({ ...current, author: event.target.value }))}
                        placeholder="Author name"
                      />
                    </label>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      <span className="mb-1 block">Genre</span>
                      <input
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                        value={form.genre}
                        onChange={(event) => setForm((current) => ({ ...current, genre: event.target.value }))}
                        placeholder="Genre"
                      />
                    </label>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      <span className="mb-1 block">Price</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                        value={form.price}
                        onChange={(event) => setForm((current) => ({ ...current, price: event.target.value }))}
                        placeholder="19.99"
                      />
                    </label>
                  </div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    <span className="mb-1 block">Description</span>
                    <textarea
                      className="min-h-24 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                      value={form.description}
                      onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                      placeholder="Describe the book"
                    />
                  </label>
                  <div className="flex flex-wrap items-center gap-3">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      <span className="mb-1 block">Status</span>
                      <select
                        className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                        value={form.status}
                        onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as BookStatus }))}
                      >
                        <option value="draft">Draft</option>
                        <option value="published">Published</option>
                        <option value="archived">Archived</option>
                      </select>
                    </label>
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isSaving ? 'Saving...' : selectedBookId ? 'Update Book' : 'Create Book'}
                    </button>
                    {selectedBookId ? (
                      <button
                        type="button"
                        className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-100 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
                        onClick={() => {
                          setSelectedBookId(null);
                          setForm(emptyForm);
                        }}
                      >
                        Cancel
                      </button>
                    ) : null}
                  </div>
                </form>
              </div>
            </AdminSection>

            <AdminSection title="Book Inventory">
              <div className="space-y-4">
                {books.map((book) => (
                  <div key={book.id} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{book.title}</h3>
                          <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium uppercase tracking-wide text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                            {book.status ?? 'published'}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{book.author} • {book.genre}</p>
                        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{book.description}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-100 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800" onClick={() => handleEdit(book)}>
                          Edit
                        </button>
                        <button className="rounded-lg border border-amber-200 px-3 py-2 text-sm font-semibold text-amber-700 transition hover:bg-amber-50 dark:border-amber-900 dark:text-amber-300 dark:hover:bg-amber-950/30" onClick={() => handleStatusChange(book.id, 'draft')}>
                          Draft
                        </button>
                        <button className="rounded-lg border border-green-200 px-3 py-2 text-sm font-semibold text-green-700 transition hover:bg-green-50 dark:border-green-900 dark:text-green-300 dark:hover:bg-green-950/30" onClick={() => handleStatusChange(book.id, 'published')}>
                          Publish
                        </button>
                        <button className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-100 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800" onClick={() => handleStatusChange(book.id, 'archived')}>
                          Archive
                        </button>
                        <button className="rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/30" onClick={() => handleDelete(book.id)}>
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </AdminSection>
          </div>

          <div>
            <AdminSection title="Quick Actions">
              <div className="space-y-3">
                <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors">
                  Add New Book
                </button>
                <button className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors">
                  Manage Users
                </button>
                <button className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors">
                  View Orders
                </button>
                <button className="w-full bg-orange-600 hover:bg-orange-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors">
                  Generate Report
                </button>
              </div>
            </AdminSection>

            <AdminSection title="Admin Info">
              <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4 space-y-3">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Role</p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">Super Admin</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Last Login</p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">Today at 2:34 PM</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Permissions</p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">All Access</p>
                </div>
              </div>
            </AdminSection>

            <AdminSection title="Recent Activity">
              <ActivityFeed activities={activities} />
            </AdminSection>
          </div>
        </div>
      </div>
    </main>
  );
}
