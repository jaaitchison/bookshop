'use client';

import React from 'react';
import { BookFilters } from '@/src/components/book/BookFilters';
import { BookGrid } from '@/src/components/book/BookGrid';
import { filterBooks } from '@/src/data/books';
import type { FilterOptions } from '@/src/data/books';

export default function BooksPage() {
  const [filteredBooks, setFilteredBooks] = React.useState(filterBooks({}));
  const [isLoading, setIsLoading] = React.useState(false);

  const handleFiltersChange = (filters: FilterOptions) => {
    setIsLoading(true);
    // Simulate network delay for better UX feedback
    const timer = setTimeout(() => {
      setFilteredBooks(filterBooks(filters));
      setIsLoading(false);
    }, 100);
    return () => clearTimeout(timer);
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            Browse Books
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Explore our collection of {filteredBooks.length} books
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Filters Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 space-y-6">
              <BookFilters onFiltersChange={handleFiltersChange} />
            </div>
          </div>

          {/* Books Grid */}
          <div className="lg:col-span-3">
            <BookGrid books={filteredBooks} isLoading={isLoading} />
          </div>
        </div>
      </div>
    </div>
  );
}
