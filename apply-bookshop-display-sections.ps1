$ErrorActionPreference = "Stop"

$repo = (Get-Location).Path
if (-not (Test-Path (Join-Path $repo "package.json"))) {
    throw "Run this script from the root of C:\coding\bookshop."
}

# --------------------------------------------------------------------
# Books page
# --------------------------------------------------------------------
$booksPage = @'
'use client';

import React from 'react';
import { BookFilters } from '@/src/components/book/BookFilters';
import { BookGrid } from '@/src/components/book/BookGrid';
import DisplaySection from '@/src/components/layout/DisplaySection';
import type { FilterOptions } from '@/src/data/books';
import type { Book } from '@/src/types/book';

export default function BooksPage() {
  const [filteredBooks, setFilteredBooks] = React.useState<Book[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  const handleFiltersChange = async (filters: FilterOptions) => {
    setIsLoading(true);

    const params = new URLSearchParams();
    if (filters.search) params.set('search', filters.search);
    if (filters.genre && filters.genre !== 'all') params.set('genre', filters.genre);
    if (filters.minPrice !== undefined) params.set('minPrice', String(filters.minPrice));
    if (filters.maxPrice !== undefined) params.set('maxPrice', String(filters.maxPrice));
    if (filters.minRating !== undefined) params.set('minRating', String(filters.minRating));
    if (filters.sortBy) params.set('sortBy', filters.sortBy);

    try {
      const response = await fetch(`/api/books?${params.toString()}`);
      const nextBooks = (await response.json()) as Book[];
      setFilteredBooks(nextBooks);
    } catch {
      setFilteredBooks([]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="bg-[var(--bookshop-bg)]">
      <div className="bookshop-shell space-y-6 py-6 pb-12 sm:py-8 sm:pb-16">
        <DisplaySection
          title="Browse and filter books"
          description={`Explore the catalogue using search, genre, price and rating filters. ${filteredBooks.length} books are currently shown.`}
        >
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px,1fr]">
            <aside>
              <div className="sticky top-24">
                <BookFilters onFiltersChange={handleFiltersChange} />
              </div>
            </aside>

            <div className="min-w-0">
              <BookGrid books={filteredBooks} isLoading={isLoading} />
            </div>
          </div>
        </DisplaySection>
      </div>
    </main>
  );
}
'@

Set-Content -Path (Join-Path $repo "app\books\page.tsx") -Value $booksPage -Encoding utf8

# --------------------------------------------------------------------
# Writer Studio page
# --------------------------------------------------------------------
$studioPage = @'
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
        <div className="bookshop-shell py-6 pb-12 sm:py-8 sm:pb-16">
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
      <div className="bookshop-shell space-y-6 py-6 pb-12 sm:py-8 sm:pb-16">
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
              <div className="mb-2 text-2xl">📝</div>
              <p className="font-medium text-[var(--bookshop-text)]">Write book</p>
            </button>
            <button className="bookshop-subcard p-4 text-center transition hover:bg-[var(--bookshop-accent-soft)]">
              <div className="mb-2 text-2xl">📊</div>
              <p className="font-medium text-[var(--bookshop-text)]">View analytics</p>
            </button>
            <button className="bookshop-subcard p-4 text-center transition hover:bg-[var(--bookshop-accent-soft)]">
              <div className="mb-2 text-2xl">💬</div>
              <p className="font-medium text-[var(--bookshop-text)]">Reader reviews</p>
            </button>
            <button className="bookshop-subcard p-4 text-center transition hover:bg-[var(--bookshop-accent-soft)]">
              <div className="mb-2 text-2xl">⚙️</div>
              <p className="font-medium text-[var(--bookshop-text)]">Settings</p>
            </button>
          </div>
        </DisplaySection>
      </div>
    </main>
  );
}
'@

Set-Content -Path (Join-Path $repo "app\studio\page.tsx") -Value $studioPage -Encoding utf8

# --------------------------------------------------------------------
# Make the admin-specific wrapper use the generic display section.
# --------------------------------------------------------------------
$adminComponents = @'
'use client';

import React from 'react';
import DisplaySection from '@/src/components/layout/DisplaySection';

export const AdminAlert: React.FC<{
  type: 'warning' | 'info' | 'success' | 'error';
  title: string;
  message: string;
}> = ({ type, title, message }) => {
  const colors = {
    warning: 'bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800/50',
    info: 'bg-violet-50 border-violet-200 dark:bg-violet-950/30 dark:border-violet-800/50',
    success: 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800/50',
    error: 'bg-rose-50 border-rose-200 dark:bg-rose-950/30 dark:border-rose-800/50',
  };

  const textColors = {
    warning: 'text-amber-800 dark:text-amber-200',
    info: 'text-violet-800 dark:text-violet-200',
    success: 'text-emerald-800 dark:text-emerald-200',
    error: 'text-rose-800 dark:text-rose-200',
  };

  const titleColors = {
    warning: 'text-amber-900 dark:text-amber-100',
    info: 'text-violet-900 dark:text-violet-100',
    success: 'text-emerald-900 dark:text-emerald-100',
    error: 'text-rose-900 dark:text-rose-100',
  };

  return (
    <div className={`rounded-[1.5rem] border p-4 ${colors[type]}`}>
      <h3 className={`font-semibold ${titleColors[type]}`}>{title}</h3>
      <p className={`mt-1 text-sm ${textColors[type]}`}>{message}</p>
    </div>
  );
};

export const AdminSection: React.FC<{
  title: string;
  description?: string;
  children: React.ReactNode;
}> = ({ title, description, children }) => {
  return (
    <DisplaySection title={title} description={description} className="mb-6">
      {children}
    </DisplaySection>
  );
};

export default AdminAlert;
'@

Set-Content -Path (Join-Path $repo "src\components\admin\AdminComponents.tsx") -Value $adminComponents -Encoding utf8

# --------------------------------------------------------------------
# Remove the duplicate Admin page heading because PageHeader owns it.
# --------------------------------------------------------------------
$adminPath = Join-Path $repo "app\admin\page.tsx"
$admin = Get-Content $adminPath -Raw

$oldHeader = @'
        <div className="mb-12">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-violet-700 dark:text-violet-300">Admin console</p>
          <h1 className="mt-3 text-3xl font-bold text-[var(--bookshop-text)]">Admin Dashboard</h1>
          <p className="mt-2 text-[var(--bookshop-muted)]">
            Manage your bookshop, users, and view analytics
          </p>
        </div>

'@

if ($admin.Contains($oldHeader)) {
    $admin = $admin.Replace($oldHeader, "")
} else {
    Write-Warning "The expected Admin duplicate header was not found. No Admin business logic was changed."
}

# tighten spacing now that the global PageHeader is above the page
$admin = $admin.Replace('<div className="bookshop-shell py-12">', '<div className="bookshop-shell py-6 pb-12 sm:py-8 sm:pb-16">')

Set-Content -Path $adminPath -Value $admin -Encoding utf8

Write-Host ""
Write-Host "Second-pass layout refactor completed." -ForegroundColor Green
Write-Host "Updated:"
Write-Host "  app/books/page.tsx"
Write-Host "  app/studio/page.tsx"
Write-Host "  app/admin/page.tsx"
Write-Host "  src/components/admin/AdminComponents.tsx"
Write-Host ""
Write-Host "Now run:"
Write-Host "  npm run lint"
Write-Host "  npm run build"