'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useCart } from '../../context/CartContext';

export const CartDrawer: React.FC = () => {
  const {
    items,
    isOpen,
    closeCart,
    removeItem,
    updateQuantity,
    subtotal,
    clearCart,
    isLoading,
    isUpdating,
    error,
    clearError,
  } = useCart();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60]">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={closeCart} />
      <aside className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col border-l border-[var(--bookshop-border)] bg-[var(--bookshop-surface)] p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-[var(--bookshop-border)] pb-4">
          <div>
            <h2 className="text-xl font-semibold text-[var(--bookshop-text)]">Your cart</h2>
            <p className="text-sm text-[var(--bookshop-muted)]">{items.length} item(s)</p>
          </div>
          <button onClick={closeCart} className="rounded-full p-2 text-[var(--bookshop-muted)] transition hover:bg-[var(--bookshop-accent-soft)]">
            ✕
          </button>
        </div>

        {error ? (
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            <p>{error}</p>
            <div className="mt-3 flex gap-3">
              <Link href="/auth" onClick={closeCart} className="font-semibold underline">Sign in</Link>
              <button type="button" onClick={clearError} className="font-semibold underline">Dismiss</button>
            </div>
          </div>
        ) : null}

        {isLoading ? (
          <div className="flex flex-1 items-center justify-center text-sm text-[var(--bookshop-muted)]">
            Loading your saved cart...
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center text-center">
            <p className="text-lg font-medium text-[var(--bookshop-text)]">Your cart is empty.</p>
            <p className="mt-2 text-sm text-[var(--bookshop-muted)]">Add a few books to see them here.</p>
          </div>
        ) : (
          <>
            <div className="mt-6 flex-1 space-y-4 overflow-y-auto pr-2">
              {items.map((item) => (
                <div key={item.book.id} className="bookshop-subcard flex gap-4 p-3">
                  <div className="relative h-24 w-16 shrink-0 overflow-hidden rounded-md bg-[var(--bookshop-surface)]">
                    <Image src={item.book.cover} alt={item.book.title} fill className="object-cover" />
                  </div>
                  <div className="flex flex-1 flex-col justify-between">
                    <div>
                      <p className="font-medium text-[var(--bookshop-text)]">{item.book.title}</p>
                      <p className="text-sm text-[var(--bookshop-muted)]">{item.book.author}</p>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => void updateQuantity(item.book.id, item.quantity - 1)}
                          disabled={isUpdating}
                          className="h-7 w-7 rounded-full border border-[var(--bookshop-border)] text-sm text-[var(--bookshop-text)]"
                        >
                          −
                        </button>
                        <span className="text-sm font-medium text-[var(--bookshop-text)]">{item.quantity}</span>
                        <button
                          onClick={() => void updateQuantity(item.book.id, item.quantity + 1)}
                          disabled={isUpdating}
                          className="h-7 w-7 rounded-full border border-[var(--bookshop-border)] text-sm text-[var(--bookshop-text)]"
                        >
                          +
                        </button>
                      </div>
                      <button disabled={isUpdating} onClick={() => void removeItem(item.book.id)} className="text-sm text-rose-600 disabled:opacity-60 dark:text-rose-300">
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 border-t border-[var(--bookshop-border)] pt-4">
              <div className="flex items-center justify-between text-sm text-[var(--bookshop-muted)]">
                <span>Subtotal</span>
                <span className="font-semibold text-[var(--bookshop-text)]">${subtotal.toFixed(2)}</span>
              </div>
              <div className="mt-4 flex gap-3">
                <button disabled={isUpdating} onClick={() => void clearCart()} className="bookshop-button-quiet flex-1 px-4 py-3 text-sm disabled:opacity-60">
                  Clear cart
                </button>
                <Link href="/checkout" onClick={closeCart} className="bookshop-button-primary flex-1 px-4 py-3 text-center text-sm">
                  Checkout
                </Link>
              </div>
            </div>
          </>
        )}
      </aside>
    </div>
  );
};

export default CartDrawer;
