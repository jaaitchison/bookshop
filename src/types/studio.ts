export interface WriterStats {
  totalBooks: number;
  publishedBooks: number;
  totalBooksSold: number;
  totalRevenue: number;
  avgRating: number;
}

export interface WriterSalesAnalytics {
  currency: 'GBP';
  totalBooksSold: number;
  totalRevenue: number;
  books: Array<{
    bookId: string;
    title: string;
    booksSold: number;
    revenue: number;
  }>;
}

export interface WriterBook {
  id: string;
  title: string;
  genre: string;
  publishedDate: string;
  views: number;
  sales: number;
  rating: number;
  reviews: number;
  status: 'draft' | 'in_review' | 'changes_requested' | 'approved' | 'published' | 'archived';
  moderationReason?: string;
  cover: string;
}

export interface WriterActivity {
  id: string;
  type: 'book_published' | 'review_received' | 'sale_made' | 'view_milestone';
  message: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}
