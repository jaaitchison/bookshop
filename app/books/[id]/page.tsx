import dynamic from "next/dynamic";
import {
  getBookById,
  getCatalogBooks,
} from "@/src/lib/catalog-data";

const BookDetail = dynamic(() =>
  import("@/src/components/book/BookDetail").then(
    (mod) => mod.BookDetail,
  ),
);

interface BookPageProps {
  params: Promise<{ id: string }>;
}

export default async function BookPage({
  params,
}: BookPageProps) {
  const { id } = await params;
  const book = await getBookById(id);

  if (!book) {
    return (
      <div className="min-h-screen bg-white px-4 py-24 text-center dark:bg-gray-900">
        <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Book not found.
        </p>
      </div>
    );
  }

  const books = await getCatalogBooks();
  const relatedBooks = books
    .filter((relatedBook) => relatedBook.id !== book.id)
    .slice(0, 3);

  return (
    <BookDetail
      book={book}
      relatedBooks={relatedBooks}
    />
  );
}
