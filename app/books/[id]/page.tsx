'use client';

import dynamic from 'next/dynamic';
import { useParams } from 'next/navigation';
import { getBookById, mockBooks } from '@/src/data/books';

const BookDetail = dynamic(() => import('@/src/components/book/BookDetail').then((mod) => mod.BookDetail));

export default function BookPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const book = id ? getBookById(id) : undefined;

  if (!book) {
    return (
      <div className="min-h-screen bg-white px-4 py-24 text-center dark:bg-gray-900">
        <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">Book not found.</p>
      </div>
    );
  }

  const relatedBooks = mockBooks.filter((relatedBook) => relatedBook.id !== book.id).slice(0, 3);

  return <BookDetail book={book} relatedBooks={relatedBooks} />;
}
