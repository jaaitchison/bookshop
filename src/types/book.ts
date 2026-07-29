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
}
