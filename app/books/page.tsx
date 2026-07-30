'use client';

import React from 'react';
import { BookFilters } from '@/src/components/book/BookFilters';
import { BookGrid } from '@/src/components/book/BookGrid';
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
          <div className="lg:col-span-1">
            <div className="sticky top-24 space-y-6">
              <BookFilters onFiltersChange={handleFiltersChange} />
            </div>
          </div>

          <div className="lg:col-span-3">
            <BookGrid books={filteredBooks} isLoading={isLoading} />
          </div>
        </div>
      </div>
    </div>
  );
}
