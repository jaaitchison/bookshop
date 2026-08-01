import Link from 'next/link';
import { BookCard } from './BookCard';
import { getFeaturedBooks } from '@/src/lib/catalog-data';

export const FeaturedBooks = async () => {
  const books = await getFeaturedBooks();

  return (
    <section className="pb-16 pt-0">
      <div className="mx-auto w-11/12 sm:w-10/12 lg:w-4/5">
        <div className="rounded-3xl border border-slate-200 border-l-8 border-l-blue-600 bg-white shadow-sm dark:border-slate-700 dark:border-l-blue-500 dark:bg-slate-900">
          <div className="flex items-center justify-between border-b border-slate-200 px-10 py-6 dark:border-slate-700">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                Featured Books
              </h2>
              <p className="mt-2 text-slate-600 dark:text-slate-300">
                Discover our handpicked collection of must-read books.
              </p>
            </div>
            <Link
              href="/books"
              className="text-sm font-semibold text-blue-700 transition hover:text-blue-800 dark:text-blue-300"
            >
              View All â†’
            </Link>
          </div>

          <div className="grid grid-cols-1 gap-6 px-10 py-8 sm:grid-cols-2 lg:grid-cols-3">
            {books.map((book) => (
              <BookCard key={book.id} book={book} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
