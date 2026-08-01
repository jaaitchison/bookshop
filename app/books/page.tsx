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
    <div className="min-h-screen bg-[var(--bookshop-bg)]">
      <div className="bookshop-shell py-16">
        <div className="mb-8 rounded-[2rem] border border-[var(--bookshop-border)] bg-[var(--bookshop-surface)] p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-violet-700">Reader showcase</p>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-[var(--bookshop-text)]">Browse books</h1>
          <p className="mt-3 max-w-2xl text-base text-[var(--bookshop-muted)]">
            Explore our collection of {filteredBooks.length} books, from fresh debuts to beloved favourites.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px,1fr]">
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
