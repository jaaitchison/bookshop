import { promises as fs } from 'fs';
import path from 'path';
import type { FilterOptions } from '@/src/data/books';
import { mockBooks as seedBooks } from '@/src/data/books';
import type { Book } from '@/src/types/book';

const catalogFile = path.join(process.cwd(), 'data', 'catalog.json');

async function readCatalogFile(): Promise<Book[]> {
  try {
    const content = await fs.readFile(catalogFile, 'utf8');
    const parsed = JSON.parse(content) as Book[];
    return Array.isArray(parsed) ? parsed : seedBooks;
  } catch {
    await fs.mkdir(path.dirname(catalogFile), { recursive: true });
    await fs.writeFile(catalogFile, JSON.stringify(seedBooks, null, 2), 'utf8');
    return seedBooks;
  }
}

async function writeCatalogFile(books: Book[]) {
  await fs.mkdir(path.dirname(catalogFile), { recursive: true });
  await fs.writeFile(catalogFile, JSON.stringify(books, null, 2), 'utf8');
}

export async function getCatalogBooks(): Promise<Book[]> {
  return readCatalogFile();
}

export async function getFeaturedBooks(): Promise<Book[]> {
  const books = await getCatalogBooks();
  return books.filter((book) => book.featured).slice(0, 6);
}

export async function getNewBooks(): Promise<Book[]> {
  const books = await getCatalogBooks();
  return books.filter((book) => book.new);
}

export async function getBookById(id: string): Promise<Book | undefined> {
  const books = await getCatalogBooks();
  return books.find((book) => book.id === id);
}

export async function filterCatalogBooks(options: FilterOptions): Promise<Book[]> {
  let results = [...(await getCatalogBooks())];

  if (options.search) {
    const query = options.search.toLowerCase();
    results = results.filter((book) => book.title.toLowerCase().includes(query) || book.author.toLowerCase().includes(query));
  }

  if (options.genre && options.genre !== 'all') {
    results = results.filter((book) => book.genre === options.genre);
  }

  if (options.minPrice !== undefined) {
    results = results.filter((book) => book.price >= options.minPrice!);
  }

  if (options.maxPrice !== undefined) {
    results = results.filter((book) => book.price <= options.maxPrice!);
  }

  if (options.minRating !== undefined) {
    results = results.filter((book) => book.rating >= options.minRating!);
  }

  switch (options.sortBy) {
    case 'price-asc':
      results.sort((a, b) => a.price - b.price);
      break;
    case 'price-desc':
      results.sort((a, b) => b.price - a.price);
      break;
    case 'rating':
      results.sort((a, b) => b.rating - a.rating);
      break;
    case 'reviews':
      results.sort((a, b) => b.reviews - a.reviews);
      break;
    case 'featured':
    default:
      results.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
  }

  return results;
}

export async function seedCatalogBooks(books: Book[]) {
  await writeCatalogFile(books);
}
