import Link from 'next/link';
import { BookCard } from './BookCard';
import { getFeaturedBooks } from '@/src/lib/catalog-data';

export const FeaturedBooks = async () => {
  const books = await getFeaturedBooks();

  return (
    <section className="py-16">
      <div className="bookshop-shell">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h2 className="mb-2 text-2xl font-bold text-[var(--bookshop-text)]">
              Featured Books
            </h2>
            <p className="text-[var(--bookshop-muted)]">
              Discover our handpicked collection of must-read books
            </p>
          </div>
          <Link
            href="/books"
            className="text-sm font-semibold text-violet-700 transition-colors hover:text-violet-800"
          >
            View All →
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {books.map((book) => (
            <BookCard key={book.id} book={book} />
          ))}
        </div>
      </div>
    </section>
  );
};
