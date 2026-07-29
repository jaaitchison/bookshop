import React from 'react';
import { BookCard } from './BookCard';
import type { Book } from '../../types/book';

interface BookGridProps {
  books: Book[];
  isLoading?: boolean;
}

export const BookGrid: React.FC<BookGridProps> = ({ books, isLoading }) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="bg-gray-300 dark:bg-gray-700 rounded-lg mb-4 aspect-[3/4]" />
            <div className="space-y-2">
              <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-3/4" />
              <div className="h-3 bg-gray-300 dark:bg-gray-700 rounded w-1/2" />
              <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-1/4" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (books.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-600 dark:text-gray-400 text-lg">
          No books found. Try adjusting your filters or search query.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
      {books.map((book) => (
        <BookCard key={book.id} book={book} />
      ))}
    </div>
  );
};
