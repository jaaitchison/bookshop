export interface Book {
  id: string;
  title: string;
  author: string;
  cover: string;
  price: number;
  rating: number;
  reviews: number;
  description: string;
  genre: string;
  featured?: boolean;
  new?: boolean;
  status?: 'draft' | 'published' | 'archived';
}

export interface BookReview {
  id: string;
  user: string;
  rating: number;
  comment: string;
  createdAt: string;
}
