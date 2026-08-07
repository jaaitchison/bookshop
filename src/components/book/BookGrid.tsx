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
      <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="animate-pulse rounded-[1.5rem] border border-[var(--bookshop-border)] bg-[var(--bookshop-surface)] p-3 shadow-sm">
            <div className="mb-4 aspect-[3/4] rounded-[1.15rem] bg-slate-200" />
            <div className="space-y-2">
              <div className="h-4 w-3/4 rounded-full bg-slate-200" />
              <div className="h-3 w-1/2 rounded-full bg-slate-200" />
              <div className="h-4 w-1/4 rounded-full bg-slate-200" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (books.length === 0) {
    return (
      <div className="rounded-[1.5rem] border border-[var(--bookshop-border)] bg-[var(--bookshop-surface)] py-16 text-center shadow-sm">
        <p className="text-lg text-slate-600">No books found. Try adjusting your filters or search query.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
      {books.map((book) => (
        <BookCard key={book.id} book={book} />
      ))}
    </div>
  );
};
