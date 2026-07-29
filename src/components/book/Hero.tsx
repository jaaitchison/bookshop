import React from 'react';
import Link from 'next/link';

export const Hero: React.FC = () => {
  return (
    <section className="relative py-20 sm:py-32 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800 -z-10" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center space-y-8">
          <div className="space-y-4">
            <h1 className="text-5xl sm:text-6xl font-bold text-gray-900 dark:text-gray-100 leading-tight">
              Discover Your Next <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">Great Read</span>
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Explore thousands of books across all genres. Find bestsellers, hidden gems, and everything in between.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/books"
              className="inline-flex items-center justify-center px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
            >
              Browse Books
            </Link>
            <Link
              href="/studio"
              className="inline-flex items-center justify-center px-8 py-3 border-2 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-800 font-semibold rounded-lg transition-colors"
            >
              Become a Writer
            </Link>
          </div>

          <div className="grid grid-cols-3 gap-4 sm:gap-8 pt-8 border-t border-gray-200 dark:border-gray-700">
            <div>
              <div className="text-3xl font-bold text-blue-600">50K+</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Books</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-blue-600">100K+</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Readers</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-blue-600">5K+</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Authors</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
