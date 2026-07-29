'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useCart } from '../../context/CartContext';

export const CartDrawer: React.FC = () => {
  const { items, isOpen, closeCart, removeItem, updateQuantity, subtotal, clearCart } = useCart();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60]">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={closeCart} />
      <aside className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-white p-6 shadow-2xl dark:bg-gray-950">
        <div className="flex items-center justify-between border-b border-gray-200 pb-4 dark:border-gray-800">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Your cart</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">{items.length} item(s)</p>
          </div>
          <button onClick={closeCart} className="rounded-full p-2 text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800">
            ✕
          </button>
        </div>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center text-center">
            <p className="text-lg font-medium text-gray-900 dark:text-gray-100">Your cart is empty.</p>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Add a few books to see them here.</p>
          </div>
        ) : (
          <>
            <div className="mt-6 flex-1 space-y-4 overflow-y-auto pr-2">
              {items.map((item) => (
                <div key={item.book.id} className="flex gap-4 rounded-lg border border-gray-200 p-3 dark:border-gray-700">
                  <div className="relative h-24 w-16 shrink-0 overflow-hidden rounded-md bg-gray-100 dark:bg-gray-800">
                    <Image src={item.book.cover} alt={item.book.title} fill className="object-cover" />
                  </div>
                  <div className="flex flex-1 flex-col justify-between">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-gray-100">{item.book.title}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{item.book.author}</p>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateQuantity(item.book.id, item.quantity - 1)}
                          className="h-7 w-7 rounded-full border border-gray-300 text-sm dark:border-gray-700"
                        >
                          −
                        </button>
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.book.id, item.quantity + 1)}
                          className="h-7 w-7 rounded-full border border-gray-300 text-sm dark:border-gray-700"
                        >
                          +
                        </button>
                      </div>
                      <button onClick={() => removeItem(item.book.id)} className="text-sm text-red-500">
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 border-t border-gray-200 pt-4 dark:border-gray-800">
              <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
                <span>Subtotal</span>
                <span className="font-semibold text-gray-900 dark:text-gray-100">${subtotal.toFixed(2)}</span>
              </div>
              <div className="mt-4 flex gap-3">
                <button onClick={clearCart} className="flex-1 rounded-lg border border-gray-300 px-4 py-3 text-sm font-semibold text-gray-900 dark:border-gray-700 dark:text-gray-100">
                  Clear cart
                </button>
                <Link href="/checkout" onClick={closeCart} className="flex-1 rounded-lg bg-blue-600 px-4 py-3 text-center text-sm font-semibold text-white hover:bg-blue-700">
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
