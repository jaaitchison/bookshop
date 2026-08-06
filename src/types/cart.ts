import type { Book } from "@/src/types/book";

export interface CartItem {
  id: string;
  book: Book;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface ShoppingCart {
  id: string | null;
  items: CartItem[];
  count: number;
  subtotal: number;
  currency: "GBP";
  updatedAt: string | null;
}
