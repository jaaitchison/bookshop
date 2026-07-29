export interface WriterStats {
  totalBooks: number;
  totalViews: number;
  totalSales: number;
  avgRating: number;
  viewsGrowth: number;
  salesGrowth: number;
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
  status: 'draft' | 'published' | 'archived';
  cover: string;
}

export interface WriterActivity {
  id: string;
  type: 'book_published' | 'review_received' | 'sale_made' | 'view_milestone';
  message: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}
