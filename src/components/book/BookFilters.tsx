'use client';

import React from 'react';
import { GENRES } from '../../data/books';
import type { FilterOptions } from '../../data/books';

interface BookFiltersProps {
  onFiltersChange: (filters: FilterOptions) => void;
}

export const BookFilters: React.FC<BookFiltersProps> = ({ onFiltersChange }) => {
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
    <aside className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Search & Filter
        </h3>
        <button
          onClick={handleReset}
          className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
        >
          Reset Filters
        </button>
      </div>

      {/* Search */}
      <div>
        <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
          Search
        </label>
        <input
          type="text"
          placeholder="Title or author..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
        />
      </div>

      {/* Genre */}
      <div>
        <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
          Genre
        </label>
        <select
          value={genre}
          onChange={(e) => setGenre(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
        >
          <option value="all">All Genres</option>
          {GENRES.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </select>
      </div>

      {/* Price Range */}
      <div>
        <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
          Price Range
        </label>
        <div className="flex gap-2">
          <input
            type="number"
            placeholder="Min"
            min="0"
            step="0.01"
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
            className="w-1/2 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          />
          <input
            type="number"
            placeholder="Max"
            min="0"
            step="0.01"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            className="w-1/2 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          />
        </div>
      </div>

      {/* Rating */}
      <div>
        <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
          Min Rating
        </label>
        <select
          value={minRating}
          onChange={(e) => setMinRating(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
        >
          <option value="">Any Rating</option>
          <option value="3">3+ Stars</option>
          <option value="3.5">3.5+ Stars</option>
          <option value="4">4+ Stars</option>
          <option value="4.5">4.5+ Stars</option>
          <option value="4.8">4.8+ Stars</option>
        </select>
      </div>

      {/* Sort */}
      <div>
        <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
          Sort By
        </label>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as 'featured' | 'price-asc' | 'price-desc' | 'rating' | 'reviews')}
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
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
