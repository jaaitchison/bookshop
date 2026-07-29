import type { Book } from '../types/book';

export const mockBooks: Book[] = [
  {
    id: 'the-midnight-library',
    title: 'The Midnight Library',
    author: 'Matt Haig',
    cover: 'https://images.unsplash.com/photo-1507842217343-583f20270319?w=400&h=600&fit=crop',
    price: 14.99,
    rating: 4.8,
    reviews: 3245,
    description: 'A dazzling novel about a woman who gets a chance to revisit her life and explore alternate versions of her destiny.',
    genre: 'Fiction',
    featured: true,
    new: false,
  },
  {
    id: 'project-hail-mary',
    title: 'Project Hail Mary',
    author: 'Andy Weir',
    cover: 'https://images.unsplash.com/photo-1532012197267-da84d127e765?w=400&h=600&fit=crop',
    price: 16.99,
    rating: 4.9,
    reviews: 2891,
    description: 'A lone astronaut must save Earth from extinction in this thrilling sci-fi adventure.',
    genre: 'Science Fiction',
    featured: true,
    new: false,
  },
  {
    id: 'lessons-in-chemistry',
    title: 'Lessons in Chemistry',
    author: 'Bonnie Garmus',
    cover: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=400&h=600&fit=crop',
    price: 15.99,
    rating: 4.7,
    reviews: 2156,
    description: 'A compelling story of a female chemist in the 1960s breaking barriers and changing lives.',
    genre: 'Fiction',
    featured: true,
    new: false,
  },
  {
    id: 'atomic-habits',
    title: 'Atomic Habits',
    author: 'James Clear',
    cover: 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=400&h=600&fit=crop',
    price: 18.99,
    rating: 4.9,
    reviews: 5432,
    description: 'Transform your life with tiny changes that create remarkable results.',
    genre: 'Self-Help',
    featured: false,
    new: false,
  },
  {
    id: 'the-seven-husbands',
    title: 'The Seven Husbands of Evelyn Hugo',
    author: 'Taylor Jenkins Reid',
    cover: 'https://images.unsplash.com/photo-1495446815901-a7297e3ffe02?w=400&h=600&fit=crop',
    price: 14.99,
    rating: 4.8,
    reviews: 3876,
    description: 'A reclusive Hollywood icon reveals her glamorous and scandalous life story.',
    genre: 'Fiction',
    featured: false,
    new: true,
  },
  {
    id: 'dune',
    title: 'Dune',
    author: 'Frank Herbert',
    cover: 'https://images.unsplash.com/photo-1507842217343-583f20270319?w=400&h=600&fit=crop',
    price: 17.99,
    rating: 4.7,
    reviews: 4201,
    description: 'An epic science fiction masterpiece set on the desert planet Arrakis.',
    genre: 'Science Fiction',
    featured: true,
    new: false,
  },
  {
    id: 'the-silent-patient',
    title: 'The Silent Patient',
    author: 'Alex Michaelides',
    cover: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=400&h=600&fit=crop',
    price: 13.99,
    rating: 4.6,
    reviews: 2765,
    description: 'A shocking psychological thriller with a twist you won\'t see coming.',
    genre: 'Thriller',
    featured: false,
    new: false,
  },
  {
    id: 'circe',
    title: 'Circe',
    author: 'Madeline Miller',
    cover: 'https://images.unsplash.com/photo-1495446815901-a7297e3ffe02?w=400&h=600&fit=crop',
    price: 14.99,
    rating: 4.8,
    reviews: 3234,
    description: 'A captivating retelling of the witch Circe\'s story from Greek mythology.',
    genre: 'Fantasy',
    featured: true,
    new: false,
  },
];

export const GENRES = ['Fiction', 'Science Fiction', 'Thriller', 'Fantasy', 'Self-Help'];

export const getFeaturedBooks = (): Book[] => {
  return mockBooks.filter(book => book.featured).slice(0, 6);
};

export const getNewBooks = (): Book[] => {
  return mockBooks.filter(book => book.new);
};

export interface FilterOptions {
  search?: string;
  genre?: string;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  sortBy?: 'featured' | 'price-asc' | 'price-desc' | 'rating' | 'reviews';
}

export const filterBooks = (options: FilterOptions): Book[] => {
  let results = [...mockBooks];

  // Search by title or author
  if (options.search) {
    const query = options.search.toLowerCase();
    results = results.filter(
      book =>
        book.title.toLowerCase().includes(query) ||
        book.author.toLowerCase().includes(query)
    );
  }

  // Filter by genre
  if (options.genre && options.genre !== 'all') {
    results = results.filter(book => book.genre === options.genre);
  }

  // Filter by price range
  if (options.minPrice !== undefined) {
    results = results.filter(book => book.price >= options.minPrice!);
  }
  if (options.maxPrice !== undefined) {
    results = results.filter(book => book.price <= options.maxPrice!);
  }

  // Filter by rating
  if (options.minRating !== undefined) {
    results = results.filter(book => book.rating >= options.minRating!);
  }

  // Sort
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
};
