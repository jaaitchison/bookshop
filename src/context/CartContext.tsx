'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useAccount } from '@/src/context/AccountContext';
import type { Book } from '@/src/types/book';
import type { CartItem, ShoppingCart } from '@/src/types/cart';

interface CartContextValue {
  items: CartItem[];
  count: number;
  subtotal: number;
  currency: ShoppingCart['currency'];
  isOpen: boolean;
  isLoading: boolean;
  isUpdating: boolean;
  error: string | null;
  addItem: (book: Book) => Promise<boolean>;
  removeItem: (bookId: string) => Promise<boolean>;
  updateQuantity: (bookId: string, quantity: number) => Promise<boolean>;
  clearCart: () => Promise<boolean>;
  refreshCart: () => Promise<boolean>;
  openCart: () => void;
  closeCart: () => void;
  clearError: () => void;
}

const EMPTY_CART: ShoppingCart = {
  id: null,
  items: [],
  count: 0,
  subtotal: 0,
  currency: 'GBP',
  updatedAt: null,
};

type CartPayload = { cart?: ShoppingCart; error?: string };

const CartContext = createContext<CartContextValue | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isAuthLoading, profile } = useAccount();
  const [cart, setCart] = useState<ShoppingCart>(EMPTY_CART);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestSequence = useRef(0);
  const pendingMutations = useRef(0);

  const refreshCart = useCallback(async (): Promise<boolean> => {
    if (!isAuthenticated || !profile.id) {
      setCart(EMPTY_CART);
      setIsLoading(false);
      return false;
    }

    const sequence = ++requestSequence.current;
    setIsLoading(true);
    try {
      const response = await fetch('/api/cart', {
        credentials: 'include',
        cache: 'no-store',
      });
      const payload = (await response.json()) as CartPayload;
      if (!response.ok || !payload.cart) throw new Error(payload.error ?? 'Unable to load your cart.');
      if (sequence === requestSequence.current) {
        setCart(payload.cart);
        setError(null);
      }
      return true;
    } catch (nextError) {
      if (sequence === requestSequence.current) {
        setCart(EMPTY_CART);
        setError(nextError instanceof Error ? nextError.message : 'Unable to load your cart.');
      }
      return false;
    } finally {
      if (sequence === requestSequence.current) setIsLoading(false);
    }
  }, [isAuthenticated, profile.id]);

  useEffect(() => {
    let active = true;
    const hydrate = async () => {
      if (isAuthLoading) return;
      if (!isAuthenticated || !profile.id) {
        await Promise.resolve();
        if (active) {
          requestSequence.current += 1;
          setCart(EMPTY_CART);
          setError(null);
          setIsLoading(false);
        }
        return;
      }
      if (active) await refreshCart();
    };
    void hydrate();
    return () => {
      active = false;
    };
  }, [isAuthLoading, isAuthenticated, profile.id, refreshCart]);

  const mutateCart = useCallback(async (
    method: 'POST' | 'PATCH' | 'DELETE',
    body?: { bookId?: string; quantity?: number },
  ): Promise<boolean> => {
    if (!isAuthenticated || !profile.id) {
      setError('Sign in with a Reader account to keep a persistent cart.');
      setIsOpen(true);
      return false;
    }

    const sequence = ++requestSequence.current;
    pendingMutations.current += 1;
    setIsUpdating(true);
    setError(null);
    try {
      const response = await fetch('/api/cart', {
        method,
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body ?? {}),
      });
      const payload = (await response.json()) as CartPayload;
      if (!response.ok || !payload.cart) throw new Error(payload.error ?? 'Cart update failed.');
      if (sequence === requestSequence.current) {
        setCart(payload.cart);
        setIsLoading(false);
      }
      return true;
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Cart update failed.');
      return false;
    } finally {
      pendingMutations.current -= 1;
      if (pendingMutations.current === 0) setIsUpdating(false);
    }
  }, [isAuthenticated, profile.id]);

  const addItem = useCallback(async (book: Book) => {
    setIsOpen(true);
    return mutateCart('POST', { bookId: book.id, quantity: 1 });
  }, [mutateCart]);

  const removeItem = useCallback(
    (bookId: string) => mutateCart('DELETE', { bookId }),
    [mutateCart],
  );

  const updateQuantity = useCallback(
    (bookId: string, quantity: number) => quantity <= 0
      ? mutateCart('DELETE', { bookId })
      : mutateCart('PATCH', { bookId, quantity }),
    [mutateCart],
  );

  const clearCart = useCallback(() => mutateCart('DELETE'), [mutateCart]);
  const openCart = useCallback(() => setIsOpen(true), []);
  const closeCart = useCallback(() => setIsOpen(false), []);
  const clearError = useCallback(() => setError(null), []);

  const value = useMemo<CartContextValue>(() => ({
    items: cart.items,
    count: cart.count,
    subtotal: cart.subtotal,
    currency: cart.currency,
    isOpen,
    isLoading,
    isUpdating,
    error,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    refreshCart,
    openCart,
    closeCart,
    clearError,
  }), [
    cart,
    isOpen,
    isLoading,
    isUpdating,
    error,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    refreshCart,
    openCart,
    closeCart,
    clearError,
  ]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within a CartProvider');
  return context;
};
