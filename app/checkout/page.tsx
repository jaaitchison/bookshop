'use client';

import Link from 'next/link';
import { useCart } from '../../src/context/CartContext';

export default function CheckoutPage() {
  const { items, subtotal, clearCart } = useCart();

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-24 dark:bg-gray-950">
      <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1.2fr,0.8fr]">
        <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-600 dark:text-blue-400">
            Checkout
          </p>
          <h1 className="mt-4 text-3xl font-bold text-gray-900 dark:text-gray-100">
            Secure your order
          </h1>
          <p className="mt-3 text-lg text-gray-600 dark:text-gray-400">
            Enter your shipping details and payment information to complete your purchase.
          </p>

          <div className="mt-8 space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Shipping details</h2>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <input className="rounded-lg border border-gray-300 px-4 py-3 text-sm dark:border-gray-700 dark:bg-gray-800" placeholder="Full name" />
                <input className="rounded-lg border border-gray-300 px-4 py-3 text-sm dark:border-gray-700 dark:bg-gray-800" placeholder="Email address" />
                <input className="rounded-lg border border-gray-300 px-4 py-3 text-sm dark:border-gray-700 dark:bg-gray-800 md:col-span-2" placeholder="Street address" />
                <input className="rounded-lg border border-gray-300 px-4 py-3 text-sm dark:border-gray-700 dark:bg-gray-800" placeholder="City" />
                <input className="rounded-lg border border-gray-300 px-4 py-3 text-sm dark:border-gray-700 dark:bg-gray-800" placeholder="ZIP code" />
              </div>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Payment</h2>
              <div className="mt-4 space-y-4">
                <input className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm dark:border-gray-700 dark:bg-gray-800" placeholder="Card number" />
                <div className="grid gap-4 md:grid-cols-2">
                  <input className="rounded-lg border border-gray-300 px-4 py-3 text-sm dark:border-gray-700 dark:bg-gray-800" placeholder="MM / YY" />
                  <input className="rounded-lg border border-gray-300 px-4 py-3 text-sm dark:border-gray-700 dark:bg-gray-800" placeholder="CVC" />
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button className="rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700">
                Place order
              </button>
              <Link href="/books" className="rounded-lg border border-gray-300 px-6 py-3 font-semibold text-gray-900 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-100 dark:hover:bg-gray-800">
                Continue shopping
              </Link>
            </div>
          </div>
        </div>

        <aside className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Order summary</h2>
          <div className="mt-6 space-y-4">
            {items.length === 0 ? (
              <p className="text-sm text-gray-600 dark:text-gray-400">Your cart is empty. Add books to continue.</p>
            ) : (
              items.map((item) => (
                <div key={item.book.id} className="flex items-center justify-between text-sm text-gray-700 dark:text-gray-300">
                  <span>
                    {item.book.title} × {item.quantity}
                  </span>
                  <span>${(item.book.price * item.quantity).toFixed(2)}</span>
                </div>
              ))
            )}
          </div>

          <div className="mt-8 space-y-3 border-t border-gray-200 pt-6 text-sm text-gray-700 dark:border-gray-800 dark:text-gray-300">
            <div className="flex items-center justify-between">
              <span>Subtotal</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Shipping</span>
              <span>Free</span>
            </div>
            <div className="flex items-center justify-between text-base font-semibold text-gray-900 dark:text-gray-100">
              <span>Total</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
          </div>

          <button
            onClick={clearCart}
            className="mt-8 text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
          >
            Clear cart
          </button>
        </aside>
      </div>
    </div>
  );
}
