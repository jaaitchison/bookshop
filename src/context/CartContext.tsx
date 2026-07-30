'use client';

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { Book } from '../types/book';

export interface CartItem {
  book: Book;
  quantity: number;
}

interface CartContextValue {
  items: CartItem[];
  count: number;
  subtotal: number;
  isOpen: boolean;
  addItem: (book: Book) => void;
  removeItem: (bookId: string) => void;
  updateQuantity: (bookId: string, quantity: number) => void;
  clearCart: () => void;
  openCart: () => void;
  closeCart: () => void;
}

const CartContext = createContext<CartContextValue | undefined>(undefined);
const STORAGE_KEY = 'bp_cart_items';

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as CartItem[];
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // ignore malformed storage data
    }
    return [];
  });
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const addItem = (book: Book) => {
    setItems((current) => {
      const existing = current.find((item) => item.book.id === book.id);
      if (existing) {
        return current.map((item) =>
          item.book.id === book.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }

      return [...current, { book, quantity: 1 }];
    });
    setIsOpen(true);
  };

  const removeItem = (bookId: string) => {
    setItems((current) => current.filter((item) => item.book.id !== bookId));
  };

  const updateQuantity = (bookId: string, quantity: number) => {
    setItems((current) => {
      if (quantity <= 0) {
        return current.filter((item) => item.book.id !== bookId);
      }

      return current.map((item) => (item.book.id === bookId ? { ...item, quantity } : item));
    });
  };

  const clearCart = () => setItems([]);
  const openCart = () => setIsOpen(true);
  const closeCart = () => setIsOpen(false);

  const count = useMemo(() => items.reduce((sum, item) => sum + item.quantity, 0), [items]);
  const subtotal = useMemo(
    () => items.reduce((sum, item) => sum + item.book.price * item.quantity, 0),
    [items]
  );

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      count,
      subtotal,
      isOpen,
      addItem,
      removeItem,
      updateQuantity,
      clearCart,
      openCart,
      closeCart,
    }),
    [items, count, subtotal, isOpen]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
