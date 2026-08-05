'use client';

import React from 'react';
import type { FilterOptions } from '../../types/book';

interface BookFiltersProps {
  genres: string[];
  onFiltersChange: (filters: FilterOptions) => void;
}

export const BookFilters: React.FC<BookFiltersProps> = ({ genres, onFiltersChange }) => {
  const [search, setSearch] = React.useState('');
  const [genre, setGenre] = React.useState('all');
  const [minPrice, setMinPrice] = React.useState('');
  const [maxPrice, setMaxPrice] = React.useState('');
  const [minRating, setMinRating] = React.useState('');
  const [sortBy, setSortBy] = React.useState<'featured' | 'price-asc' | 'price-desc' | 'rating' | 'reviews'>('featured');

  const handleFilterChange = React.useCallback(() => {
    const filters: FilterOptions = {
      search: search || undefined,
      genre: genre !== 'all' ? genre : undefined,
      minPrice: minPrice ? parseFloat(minPrice) : undefined,
      maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
      minRating: minRating ? parseFloat(minRating) : undefined,
      sortBy,
    };
    onFiltersChange(filters);
  }, [search, genre, minPrice, maxPrice, minRating, sortBy, onFiltersChange]);

  React.useEffect(() => {
    handleFilterChange();
  }, [search, genre, minPrice, maxPrice, minRating, sortBy, handleFilterChange]);

  const handleReset = () => {
    setSearch('');
    setGenre('all');
    setMinPrice('');
    setMaxPrice('');
    setMinRating('');
    setSortBy('featured');
  };

  return (
    <aside className="space-y-6 rounded-[1.5rem] border border-[var(--bookshop-border)] bg-[var(--bookshop-surface)] p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Search & filter</h3>
          <p className="mt-1 text-sm text-slate-600">Choose a mood, price, and format that feels right.</p>
        </div>
        <button onClick={handleReset} className="text-sm font-semibold text-violet-700 transition hover:text-violet-800">
          Reset
        </button>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-slate-700">Search</label>
        <input
          type="text"
          placeholder="Title or author..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-2xl border border-[var(--bookshop-border)] bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-violet-400"
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-slate-700">Genre</label>
        <select
          value={genre}
          onChange={(e) => setGenre(e.target.value)}
          className="w-full rounded-2xl border border-[var(--bookshop-border)] bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-violet-400"
        >
          <option value="all">All Genres</option>
          {genres.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-slate-700">Price range</label>
        <div className="flex gap-2">
          <input
            type="number"
            placeholder="Min"
            min="0"
            step="0.01"
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
            className="w-1/2 rounded-2xl border border-[var(--bookshop-border)] bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-violet-400"
          />
          <input
            type="number"
            placeholder="Max"
            min="0"
            step="0.01"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            className="w-1/2 rounded-2xl border border-[var(--bookshop-border)] bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-violet-400"
          />
        </div>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-slate-700">Min rating</label>
        <select
          value={minRating}
          onChange={(e) => setMinRating(e.target.value)}
          className="w-full rounded-2xl border border-[var(--bookshop-border)] bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-violet-400"
        >
          <option value="">Any Rating</option>
          <option value="3">3+ Stars</option>
          <option value="3.5">3.5+ Stars</option>
          <option value="4">4+ Stars</option>
          <option value="4.5">4.5+ Stars</option>
          <option value="4.8">4.8+ Stars</option>
        </select>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-slate-700">Sort by</label>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as 'featured' | 'price-asc' | 'price-desc' | 'rating' | 'reviews')}
          className="w-full rounded-2xl border border-[var(--bookshop-border)] bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-violet-400"
        >
          <option value="featured">Featured</option>
          <option value="price-asc">Price: Low to High</option>
          <option value="price-desc">Price: High to Low</option>
          <option value="rating">Highest Rated</option>
          <option value="reviews">Most Reviewed</option>
        </select>
      </div>
    </aside>
  );
};
