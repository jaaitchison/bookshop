import { notFound } from 'next/navigation';
import { BookDetail } from '@/src/components/book/BookDetail';
import { getBookById, mockBooks } from '@/src/data/books';

interface BookPageProps {
  params: Promise<{ id: string }>;
}

export default async function BookPage({ params }: BookPageProps) {
  const { id } = await params;
  const book = getBookById(id);

  if (!book) {
    notFound();
  }

  const relatedBooks = mockBooks.filter((relatedBook) => relatedBook.id !== book.id).slice(0, 3);

  return <BookDetail book={book} relatedBooks={relatedBooks} />;
}
