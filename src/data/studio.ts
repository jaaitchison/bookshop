import type { WriterStats, WriterBook, WriterActivity } from '@/src/types/studio';

export const getWriterStats = (): WriterStats => {
  return {
    totalBooks: 8,
    publishedBooks: 6,
    totalBooksSold: 3421,
    totalRevenue: 42857.35,
    avgRating: 4.6,
  };
};

export const getWriterBooks = (): WriterBook[] => [
  {
    id: '1',
    title: 'Echoes of Tomorrow',
    genre: 'Science Fiction',
    publishedDate: '2024-03-15',
    views: 12450,
    sales: 847,
    rating: 4.8,
    reviews: 342,
    status: 'published',
    cover: '/api/placeholder/200/300',
  },
  {
    id: '2',
    title: 'The Silent Witness',
    genre: 'Mystery',
    publishedDate: '2024-02-28',
    views: 9870,
    sales: 623,
    rating: 4.5,
    reviews: 218,
    status: 'published',
    cover: '/api/placeholder/200/300',
  },
  {
    id: '3',
    title: 'Crimson Skies',
    genre: 'Fantasy',
    publishedDate: '2024-01-10',
    views: 8560,
    sales: 521,
    rating: 4.7,
    reviews: 195,
    status: 'published',
    cover: '/api/placeholder/200/300',
  },
  {
    id: '4',
    title: 'Untitled Memoir',
    genre: 'Biography',
    publishedDate: '2024-04-20',
    views: 5340,
    sales: 230,
    rating: 0,
    reviews: 0,
    status: 'draft',
    cover: '/api/placeholder/200/300',
  },
  {
    id: '5',
    title: 'The Last Aurora',
    genre: 'Romance',
    publishedDate: '2023-12-05',
    views: 6200,
    sales: 421,
    rating: 4.4,
    reviews: 156,
    status: 'published',
    cover: '/api/placeholder/200/300',
  },
  {
    id: '6',
    title: 'Code Breaker',
    genre: 'Thriller',
    publishedDate: '2023-11-22',
    views: 2810,
    sales: 179,
    rating: 4.3,
    reviews: 68,
    status: 'published',
    cover: '/api/placeholder/200/300',
  },
];

export const getRecentActivities = (): WriterActivity[] => [
  {
    id: '1',
    type: 'review_received',
    message: '5-star review received for "Echoes of Tomorrow" by Alex Mitchell',
    timestamp: new Date('2026-07-29T22:15:00'),
    metadata: { bookId: '1', reviewer: 'Alex Mitchell', rating: 5 },
  },
  {
    id: '2',
    type: 'sale_made',
    message: 'New sale: 12 copies of "The Silent Witness" sold today',
    timestamp: new Date('2026-07-29T18:45:00'),
    metadata: { bookId: '2', copies: 12 },
  },
  {
    id: '3',
    type: 'view_milestone',
    message: 'Milestone reached: "Echoes of Tomorrow" surpassed 10,000 views!',
    timestamp: new Date('2026-07-29T14:20:00'),
    metadata: { bookId: '1', views: 10000 },
  },
  {
    id: '4',
    type: 'book_published',
    message: 'Book published: "Crimson Skies" is now live on the platform',
    timestamp: new Date('2026-07-28T10:30:00'),
    metadata: { bookId: '3' },
  },
  {
    id: '5',
    type: 'review_received',
    message: '4-star review received for "The Last Aurora" by Sarah Chen',
    timestamp: new Date('2026-07-28T08:12:00'),
    metadata: { bookId: '5', reviewer: 'Sarah Chen', rating: 4 },
  },
];

export const formatDate = (date: Date): string => {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (hours < 1) return 'just now';
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;

  return date.toLocaleDateString('en-GB', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
};

export const formatNumber = (num: number): string => {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
};
