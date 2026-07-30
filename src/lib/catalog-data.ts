import { promises as fs } from 'fs';
import path from 'path';
import type { FilterOptions } from '@/src/data/books';
import { mockBooks as seedBooks } from '@/src/data/books';
import type { Book } from '@/src/types/book';

const catalogFile = path.join(process.cwd(), 'data', 'catalog.json');

function normalizeBook(book: Book): Book {
  return {
    ...book,
    featured: book.featured ?? false,
    new: book.new ?? false,
    status: book.status ?? 'published',
    rating: book.rating ?? 0,
    reviews: book.reviews ?? 0,
    price: Number(book.price ?? 0),
  };
}

async function readCatalogFile(): Promise<Book[]> {
  try {
    const content = await fs.readFile(catalogFile, 'utf8');
    const parsed = JSON.parse(content) as Book[];
    return Array.isArray(parsed) ? parsed.map(normalizeBook) : seedBooks.map(normalizeBook);
  } catch {
    await fs.mkdir(path.dirname(catalogFile), { recursive: true });
    await fs.writeFile(catalogFile, JSON.stringify(seedBooks.map(normalizeBook), null, 2), 'utf8');
    return seedBooks.map(normalizeBook);
  }
}

async function writeCatalogFile(books: Book[]) {
  const normalizedBooks = books.map(normalizeBook);
  await fs.mkdir(path.dirname(catalogFile), { recursive: true });
  await fs.writeFile(catalogFile, JSON.stringify(normalizedBooks, null, 2), 'utf8');
}

export async function getCatalogBooks(): Promise<Book[]> {
  return readCatalogFile();
}

export async function getFeaturedBooks(): Promise<Book[]> {
  const books = await getCatalogBooks();
  return books.filter((book) => book.featured && (book.status ?? 'published') === 'published').slice(0, 6);
}

export async function getNewBooks(): Promise<Book[]> {
  const books = await getCatalogBooks();
  return books.filter((book) => book.new && (book.status ?? 'published') === 'published');
}

export async function getBookById(id: string): Promise<Book | undefined> {
  const books = await getCatalogBooks();
  return books.find((book) => book.id === id);
}

export async function filterCatalogBooks(options: FilterOptions): Promise<Book[]> {
  let results = (await getCatalogBooks()).filter((book) => (book.status ?? 'published') === 'published');

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

export async function createCatalogBook(input: Partial<Book>): Promise<Book> {
  const books = await getCatalogBooks();
  const newBook = normalizeBook({
    id: input.id ?? `book-${Date.now()}`,
    title: input.title ?? 'Untitled Book',
    author: input.author ?? 'Unknown Author',
    cover: input.cover ?? 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=400&h=600&fit=crop',
    price: Number(input.price ?? 0),
    rating: Number(input.rating ?? 0),
    reviews: Number(input.reviews ?? 0),
    description: input.description ?? '',
    genre: input.genre ?? 'Fiction',
    featured: input.featured ?? false,
    new: input.new ?? false,
    status: input.status ?? 'draft',
  });

  books.unshift(newBook);
  await writeCatalogFile(books);
  return newBook;
}

export async function updateCatalogBook(id: string, updates: Partial<Book>): Promise<Book | undefined> {
  const books = await getCatalogBooks();
  const index = books.findIndex((book) => book.id === id);

  if (index === -1) {
    return undefined;
  }

  const updatedBook = normalizeBook({
    ...books[index],
    ...updates,
    id: books[index].id,
    price: Number(updates.price ?? books[index].price),
    rating: Number(updates.rating ?? books[index].rating),
    reviews: Number(updates.reviews ?? books[index].reviews),
  });

  books[index] = updatedBook;
  await writeCatalogFile(books);
  return updatedBook;
}

export async function deleteCatalogBook(id: string): Promise<boolean> {
  const books = await getCatalogBooks();
  const nextBooks = books.filter((book) => book.id !== id);

  if (nextBooks.length === books.length) {
    return false;
  }

  await writeCatalogFile(nextBooks);
  return true;
}

export async function seedCatalogBooks(books: Book[]) {
  await writeCatalogFile(books.map(normalizeBook));
}
