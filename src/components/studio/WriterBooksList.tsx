'use client';

import React from 'react';
import type { WriterBook } from '@/src/types/studio';

interface WriterBooksListProps {
  books: WriterBook[];
}

export default function WriterBooksList({ books }: WriterBooksListProps) {
  const getStatusBadge = (status: WriterBook['status']) => {
    const statusConfig = {
      published: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      draft: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      archived: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
    };
    return statusConfig[status];
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">
                Title
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">
                Genre
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">
                Views
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">
                Sales
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">
                Rating
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">
                Status
              </th>
              <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900 dark:text-gray-100">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {books.map((book) => (
              <tr
                key={book.id}
                className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                <td className="px-6 py-4">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-gray-100">
                      {book.title}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {book.publishedDate}
                    </p>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">
                  {book.genre}
                </td>
                <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-gray-100">
                  {book.views.toLocaleString()}
                </td>
                <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-gray-100">
                  {book.sales.toLocaleString()}
                </td>
                <td className="px-6 py-4 text-sm">
                  {book.rating > 0 ? (
                    <div className="flex items-center gap-1">
                      <span className="font-medium text-gray-900 dark:text-gray-100">
                        {book.rating.toFixed(1)}
                      </span>
                      <span className="text-amber-400">⭐</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        ({book.reviews})
                      </span>
                    </div>
                  ) : (
                    <span className="text-gray-500 dark:text-gray-400">No ratings</span>
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
                  <button className="text-sm text-blue-600 dark:text-blue-400 hover:underline mr-4">
                    Edit
                  </button>
                  <button className="text-sm text-gray-600 dark:text-gray-400 hover:underline">
                    View Stats
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
