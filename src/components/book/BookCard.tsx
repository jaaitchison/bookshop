import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import type { Book } from '../../types/book';

interface BookCardProps {
  book: Book;
}

export const BookCard: React.FC<BookCardProps> = ({ book }) => {
  return (
    <Link href={`/books/${book.id}`}>
      <div className="group cursor-pointer h-full">
        <div className="relative overflow-hidden rounded-lg mb-4 bg-gray-200 dark:bg-gray-800 aspect-[3/4]">
          <Image
            src={book.cover}
            alt={book.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
          />
          {book.new && (
            <div className="absolute top-2 right-2 bg-green-500 text-white text-xs font-semibold px-3 py-1 rounded-full">
              NEW
            </div>
          )}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300" />
        </div>
        <div className="space-y-2">
          <h3 className="font-semibold text-sm line-clamp-2 text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
            {book.title}
          </h3>
          <p className="text-xs text-gray-600 dark:text-gray-400">{book.author}</p>
          <div className="flex items-center justify-between">
            <span className="font-bold text-lg text-gray-900 dark:text-gray-100">
              ${book.price.toFixed(2)}
            </span>
            <div className="flex items-center gap-1">
              <span className="text-yellow-500">★</span>
              <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                {book.rating} ({book.reviews.toLocaleString()})
              </span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
};
