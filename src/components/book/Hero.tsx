import React from 'react';
import Link from 'next/link';

export const Hero: React.FC = () => {
  return (
    <section className="py-8">
      <div className="mx-auto w-11/12 sm:w-10/12 lg:w-4/5">
        <div className="rounded-3xl border border-slate-200 border-l-8 border-l-blue-600 bg-white px-10 py-8 shadow-sm dark:border-slate-700 dark:border-l-blue-500 dark:bg-slate-900">
          <p className="text-xs font-bold uppercase tracking-widest text-blue-700 dark:text-blue-300">
            Independent publishing
          </p>

          <h2 className="mt-4 max-w-4xl text-3xl font-black tracking-tight text-slate-900 dark:text-white sm:text-4xl">
            Discover books, stories, and a place for authors to publish with clarity.
          </h2>

          <p className="mt-4 max-w-4xl text-base leading-7 text-slate-600 dark:text-slate-300">
            Bookshop brings readers and writers together in one calm, modern space â€” from discovery and previewing to checkout and a personal library.
          </p>

          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/books" className="bookshop-button-primary px-5 py-3 text-sm">
              Browse the collection
            </Link>
            <Link href="/studio" className="bookshop-button-quiet px-5 py-3 text-sm">
              Open the writer studio
            </Link>
          </div>

          <div className="mt-7 flex flex-wrap gap-x-10 gap-y-4 border-t border-slate-200 pt-6 text-sm text-slate-600 dark:border-slate-700 dark:text-slate-300">
            <div>
              <span className="block text-2xl font-bold text-slate-900 dark:text-white">50k+</span>
              <span>Books</span>
            </div>
            <div>
              <span className="block text-2xl font-bold text-slate-900 dark:text-white">100k+</span>
              <span>Readers</span>
            </div>
            <div>
              <span className="block text-2xl font-bold text-slate-900 dark:text-white">5k+</span>
              <span>Authors</span>
            </div>
          </div>

          <div className="mt-7 border-t border-slate-200 pt-6 dark:border-slate-700">
            <p className="text-xs font-bold uppercase tracking-widest text-blue-700 dark:text-blue-300">
              What readers can expect
            </p>
            <ul className="mt-4 space-y-3 text-sm text-slate-700 dark:text-slate-200">
              <li className="border-b border-slate-200 pb-3 dark:border-slate-700">
                Free previews, instant unlocks, and a focused reading view.
              </li>
              <li className="border-b border-slate-200 pb-3 dark:border-slate-700">
                A simple purchase journey that feels clear and trustworthy.
              </li>
              <li>
                A personal library that keeps your books neatly organised.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
};
