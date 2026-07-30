'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAccount } from '../../src/context/AccountContext';
import { useCart } from '../../src/context/CartContext';

const initialFormValues = {
  fullName: '',
  email: '',
  address: '',
  city: '',
  zip: '',
  cardNumber: '',
  cardExpiry: '',
  cardCvc: '',
};

export default function CheckoutPage() {
  const router = useRouter();
  const { items, subtotal, clearCart } = useCart();
  const { isAuthenticated, profile, placeOrder } = useAccount();
  const [formValues, setFormValues] = useState(initialFormValues);
  const [submittedOrderId, setSubmittedOrderId] = useState<string | null>(null);
  const [lastPurchasedBookId, setLastPurchasedBookId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);

  const shippingTotal = useMemo(() => (subtotal > 0 ? 0 : 0), [subtotal]);
  const total = subtotal + shippingTotal;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!isAuthenticated) {
      setError('Please sign in before placing an order.');
      router.push('/auth');
      return;
    }

    if (items.length === 0) {
      setError('Your cart is empty. Add a book before checking out.');
      return;
    }

    setIsPlacingOrder(true);
    setError(null);

    const orderPlaced = await placeOrder({
      items: items.map((item) => ({
        id: item.book.id,
        title: item.book.title,
        author: item.book.author,
        price: item.book.price,
        quantity: item.quantity,
      })),
      total,
      shipping: {
        name: formValues.fullName,
        email: formValues.email || profile.email,
        address: formValues.address,
        city: formValues.city,
        zip: formValues.zip,
      },
    });

    if (!orderPlaced) {
      setError('We could not place your order right now.');
      setIsPlacingOrder(false);
      return;
    }

    setLastPurchasedBookId(items[0]?.book.id ?? null);
    clearCart();
    setSubmittedOrderId(`ORD-${Date.now().toString().slice(-6)}`);
    setFormValues(initialFormValues);
    setIsPlacingOrder(false);
  };

  if (submittedOrderId) {
    return (
      <div className="min-h-screen bg-gray-50 px-4 py-24 dark:bg-gray-950">
        <div className="mx-auto max-w-3xl rounded-3xl border border-gray-200 bg-white p-10 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-green-600 dark:text-green-400">Order confirmed</p>
          <h1 className="mt-4 text-3xl font-semibold text-gray-900 dark:text-white">Thanks for your purchase, {profile.name.split(' ')[0]}.</h1>
          <p className="mt-4 text-gray-600 dark:text-gray-400">
            Your order <span className="font-semibold text-gray-900 dark:text-white">{submittedOrderId}</span> is now in our processing queue and will appear in your account history.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            {lastPurchasedBookId ? (
              <Link href={`/books/${lastPurchasedBookId}`} className="rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700">
                Start reading now
              </Link>
            ) : null}
            <Link href="/account" className="rounded-full bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700">
              View account history
            </Link>
            <Link href="/books" className="rounded-full border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-100 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800">
              Continue shopping
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-24 dark:bg-gray-950">
      <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1.2fr,0.8fr]">
        <form onSubmit={handleSubmit} className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm dark:border-gray-800 dark:bg-gray-900">
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
                <input
                  required
                  value={formValues.fullName}
                  onChange={(event) => setFormValues((current) => ({ ...current, fullName: event.target.value }))}
                  className="rounded-lg border border-gray-300 px-4 py-3 text-sm dark:border-gray-700 dark:bg-gray-800"
                  placeholder="Full name"
                />
                <input
                  required
                  type="email"
                  value={formValues.email}
                  onChange={(event) => setFormValues((current) => ({ ...current, email: event.target.value }))}
                  className="rounded-lg border border-gray-300 px-4 py-3 text-sm dark:border-gray-700 dark:bg-gray-800"
                  placeholder="Email address"
                />
                <input
                  required
                  value={formValues.address}
                  onChange={(event) => setFormValues((current) => ({ ...current, address: event.target.value }))}
                  className="rounded-lg border border-gray-300 px-4 py-3 text-sm dark:border-gray-700 dark:bg-gray-800 md:col-span-2"
                  placeholder="Street address"
                />
                <input
                  required
                  value={formValues.city}
                  onChange={(event) => setFormValues((current) => ({ ...current, city: event.target.value }))}
                  className="rounded-lg border border-gray-300 px-4 py-3 text-sm dark:border-gray-700 dark:bg-gray-800"
                  placeholder="City"
                />
                <input
                  required
                  value={formValues.zip}
                  onChange={(event) => setFormValues((current) => ({ ...current, zip: event.target.value }))}
                  className="rounded-lg border border-gray-300 px-4 py-3 text-sm dark:border-gray-700 dark:bg-gray-800"
                  placeholder="ZIP code"
                />
              </div>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Payment</h2>
              <div className="mt-4 space-y-4">
                <input
                  required
                  value={formValues.cardNumber}
                  onChange={(event) => setFormValues((current) => ({ ...current, cardNumber: event.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm dark:border-gray-700 dark:bg-gray-800"
                  placeholder="Card number"
                />
                <div className="grid gap-4 md:grid-cols-2">
                  <input
                    required
                    value={formValues.cardExpiry}
                    onChange={(event) => setFormValues((current) => ({ ...current, cardExpiry: event.target.value }))}
                    className="rounded-lg border border-gray-300 px-4 py-3 text-sm dark:border-gray-700 dark:bg-gray-800"
                    placeholder="MM / YY"
                  />
                  <input
                    required
                    value={formValues.cardCvc}
                    onChange={(event) => setFormValues((current) => ({ ...current, cardCvc: event.target.value }))}
                    className="rounded-lg border border-gray-300 px-4 py-3 text-sm dark:border-gray-700 dark:bg-gray-800"
                    placeholder="CVC"
                  />
                </div>
              </div>
            </div>

            {error ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
                {error}
              </div>
            ) : null}

            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={isPlacingOrder}
                className="rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isPlacingOrder ? 'Placing order...' : 'Place order'}
              </button>
              <Link href="/books" className="rounded-lg border border-gray-300 px-6 py-3 font-semibold text-gray-900 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-100 dark:hover:bg-gray-800">
                Continue shopping
              </Link>
            </div>
          </div>
        </form>

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
              <span>${total.toFixed(2)}</span>
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
