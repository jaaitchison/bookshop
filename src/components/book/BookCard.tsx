import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import type { Book } from '../../types/book';

interface BookCardProps {
  book: Book;
}

export const BookCard: React.FC<BookCardProps> = ({ book }) => {
  return (
    <Link href={`/books/${book.id}`} className="group h-full">
      <div className="h-full overflow-hidden rounded-[1.5rem] border border-[var(--bookshop-border)] bg-[var(--bookshop-surface)] p-3 shadow-sm transition hover:-translate-y-1 hover:shadow-md">
        <div className="relative mb-4 aspect-[3/4] overflow-hidden rounded-[1.15rem] bg-slate-100">
          <Image
            src={book.cover}
            alt={book.title}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
          {book.new ? (
            <div className="absolute right-2 top-2 rounded-full bg-violet-700 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-white">
              New
            </div>
          ) : null}
        </div>
        <div className="space-y-2 px-1 pb-1">
          <h3 className="line-clamp-2 text-sm font-semibold text-slate-900 transition group-hover:text-violet-700">
            {book.title}
          </h3>
          <p className="text-xs text-slate-600">{book.author}</p>
          <div className="flex items-center justify-between">
            <span className="text-lg font-bold text-slate-900">${book.price.toFixed(2)}</span>
            <div className="flex items-center gap-1 text-xs font-medium text-slate-600">
              <span className="text-amber-500">★</span>
              <span>{book.rating} ({book.reviews.toLocaleString()})</span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
};
