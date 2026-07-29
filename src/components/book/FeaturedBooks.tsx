import React from 'react';
import Link from 'next/link';
import { BookCard } from './BookCard';
import { getFeaturedBooks } from '../../data/books';

export const FeaturedBooks: React.FC = () => {
  const books = getFeaturedBooks();

  return (
    <section className="py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-12">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              Featured Books
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Discover our handpicked collection of must-read books
            </p>
          </div>
          <Link
            href="/books"
            className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-semibold transition-colors"
          >
            View All →
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {books.map((book) => (
            <BookCard key={book.id} book={book} />
          ))}
        </div>
      </div>
    </section>
  );
};
