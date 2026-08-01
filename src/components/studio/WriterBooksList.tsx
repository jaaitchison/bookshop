'use client';

import React from 'react';
import type { WriterBook } from '@/src/types/studio';

interface WriterBooksListProps {
  books: WriterBook[];
  onStatusChange?: (bookId: string, status: WriterBook['status']) => void | Promise<void>;
  onDelete?: (bookId: string) => void | Promise<void>;
}

export default function WriterBooksList({ books, onStatusChange, onDelete }: WriterBooksListProps) {
  const getStatusBadge = (status: WriterBook['status']) => {
    const statusConfig = {
      published: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200',
      draft: 'bg-amber-100 text-amber-800 dark:bg-amber-950/30 dark:text-amber-200',
      archived: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200',
    };
    return statusConfig[status];
  };

  return (
    <div className="bookshop-card overflow-hidden rounded-[1.5rem]">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="border-b border-[var(--bookshop-border)] bg-[var(--bookshop-surface-muted)]">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold text-[var(--bookshop-text)]">
                Title
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-[var(--bookshop-text)]">
                Genre
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-[var(--bookshop-text)]">
                Views
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-[var(--bookshop-text)]">
                Sales
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-[var(--bookshop-text)]">
                Rating
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-[var(--bookshop-text)]">
                Status
              </th>
              <th className="px-6 py-3 text-right text-sm font-semibold text-[var(--bookshop-text)]">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--bookshop-border)]">
            {books.map((book) => (
              <tr
                key={book.id}
                className="transition-colors hover:bg-[var(--bookshop-surface-muted)]"
              >
                <td className="px-6 py-4">
                  <div>
                    <p className="font-medium text-[var(--bookshop-text)]">
                      {book.title}
                    </p>
                    <p className="text-sm text-[var(--bookshop-muted)]">
                      {book.publishedDate}
                    </p>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-[var(--bookshop-muted)]">
                  {book.genre}
                </td>
                <td className="px-6 py-4 text-sm font-medium text-[var(--bookshop-text)]">
                  {book.views.toLocaleString()}
                </td>
                <td className="px-6 py-4 text-sm font-medium text-[var(--bookshop-text)]">
                  {book.sales.toLocaleString()}
                </td>
                <td className="px-6 py-4 text-sm">
                  {book.rating > 0 ? (
                    <div className="flex items-center gap-1">
                      <span className="font-medium text-[var(--bookshop-text)]">
                        {book.rating.toFixed(1)}
                      </span>
                      <span className="text-amber-400">⭐</span>
                      <span className="text-xs text-[var(--bookshop-muted)]">
                        ({book.reviews})
                      </span>
                    </div>
                  ) : (
                    <span className="text-[var(--bookshop-muted)]">No ratings</span>
                  )}
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`inline-block px-3 py-1 text-xs font-medium rounded-full ${getStatusBadge(
                      book.status
                    )}`}
                  >
                    {book.status.charAt(0).toUpperCase() + book.status.slice(1)}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex flex-wrap justify-end gap-2 text-sm">
                    <button
                      className="text-violet-700 hover:underline dark:text-violet-300"
                      onClick={() => onStatusChange?.(book.id, 'published')}
                    >
                      Publish
                    </button>
                    <button
                      className="text-amber-700 hover:underline dark:text-amber-300"
                      onClick={() => onStatusChange?.(book.id, 'draft')}
                    >
                      Draft
                    </button>
                    <button
                      className="text-[var(--bookshop-muted)] hover:underline"
                      onClick={() => onStatusChange?.(book.id, 'archived')}
                    >
                      Archive
                    </button>
                    <button
                      className="text-rose-700 hover:underline dark:text-rose-300"
                      onClick={() => onDelete?.(book.id)}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
