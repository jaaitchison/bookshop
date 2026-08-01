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
      <div className="mx-auto w-11/12 space-y-8 py-8 pb-12 sm:w-10/12 sm:pb-16 lg:w-4/5">
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


