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

    try {
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: items.map((item) => ({
            id: item.book.id,
            title: item.book.title,
            author: item.book.author,
            price: item.book.price,
            quantity: item.quantity,
          })),
          shipping: {
            name: formValues.fullName,
            email: formValues.email || profile.email,
            address: formValues.address,
            city: formValues.city,
            zip: formValues.zip,
          },
          profileId: profile.id,
        }),
      });

      const payload = await response.json() as {
        checkoutUrl?: string;
        sessionId?: string;
        demo?: boolean;
        fallbackUrl?: string;
        message?: string;
      };

      if (!response.ok && !payload.demo) {
        throw new Error(payload.message ?? 'We could not start the secure checkout flow.');
      }

      if (payload.checkoutUrl) {
        window.location.assign(payload.checkoutUrl);
        return;
      }

      if (payload.demo && payload.fallbackUrl) {
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
          throw new Error('We could not place your order right now.');
        }

        setLastPurchasedBookId(items[0]?.book.id ?? null);
        clearCart();
        setSubmittedOrderId(`ORD-${Date.now().toString().slice(-6)}`);
        setFormValues(initialFormValues);
        router.push(payload.fallbackUrl);
        return;
      }

      throw new Error(payload.message ?? 'We could not start the secure checkout flow.');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'We could not start the secure checkout flow.');
      setIsPlacingOrder(false);
    }
  };

  if (submittedOrderId) {
    return (
      <div className="min-h-screen bg-[var(--bookshop-bg)] py-8">
        <div className="mx-auto w-11/12 rounded-3xl border border-slate-200 border-l-8 border-l-emerald-600 bg-white px-8 py-7 shadow-sm sm:w-10/12 sm:px-10 lg:w-4/5 dark:border-slate-700 dark:border-l-emerald-500 dark:bg-slate-900">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-emerald-700 dark:text-emerald-300">Order confirmed</p>
          <h2 className="mt-4 text-3xl font-semibold text-[var(--bookshop-text)]">Thanks for your purchase, {profile.name.split(' ')[0]}.</h2>
          <p className="mt-4 text-[var(--bookshop-muted)]">
            Your order <span className="font-semibold text-[var(--bookshop-text)]">{submittedOrderId}</span> is now in our processing queue and will appear in your account history.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            {lastPurchasedBookId ? (
              <Link href={`/books/${lastPurchasedBookId}`} className="rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700">
                Start reading now
              </Link>
            ) : null}
            <Link href="/account" className="bookshop-button-primary px-5 py-2.5 text-sm">
              View account history
            </Link>
            <Link href="/books" className="bookshop-button-quiet px-5 py-2.5 text-sm">
              Continue shopping
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bookshop-bg)] py-8">
      <div className="bookshop-shell grid gap-6 lg:grid-cols-[1.15fr,0.85fr]">
        <form onSubmit={handleSubmit} className="rounded-3xl border border-slate-200 border-l-8 border-l-emerald-600 bg-white px-8 py-7 shadow-sm sm:px-10 dark:border-slate-700 dark:border-l-emerald-500 dark:bg-slate-900">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-violet-700 dark:text-violet-300">
            Checkout
          </p>
          <h2 className="mt-4 text-3xl font-bold text-[var(--bookshop-text)]">
            Secure your order
          </h2>
          <p className="mt-3 text-lg text-[var(--bookshop-muted)]">
            Enter your shipping details and payment information to complete your purchase.
          </p>

          <div className="mt-8 space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-[var(--bookshop-text)]">Shipping details</h2>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <input
                  required
                  value={formValues.fullName}
                  onChange={(event) => setFormValues((current) => ({ ...current, fullName: event.target.value }))}
                  className="bookshop-input"
                  placeholder="Full name"
                />
                <input
                  required
                  type="email"
                  value={formValues.email}
                  onChange={(event) => setFormValues((current) => ({ ...current, email: event.target.value }))}
                  className="bookshop-input"
                  placeholder="Email address"
                />
                <input
                  required
                  value={formValues.address}
                  onChange={(event) => setFormValues((current) => ({ ...current, address: event.target.value }))}
                  className="bookshop-input md:col-span-2"
                  placeholder="Street address"
                />
                <input
                  required
                  value={formValues.city}
                  onChange={(event) => setFormValues((current) => ({ ...current, city: event.target.value }))}
                  className="bookshop-input"
                  placeholder="City"
                />
                <input
                  required
                  value={formValues.zip}
                  onChange={(event) => setFormValues((current) => ({ ...current, zip: event.target.value }))}
                  className="bookshop-input"
                  placeholder="ZIP code"
                />
              </div>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-[var(--bookshop-text)]">Payment</h2>
              <div className="mt-4 space-y-4">
                <input
                  required
                  value={formValues.cardNumber}
                  onChange={(event) => setFormValues((current) => ({ ...current, cardNumber: event.target.value }))}
                  className="bookshop-input"
                  placeholder="Card number"
                />
                <div className="grid gap-4 md:grid-cols-2">
                  <input
                    required
                    value={formValues.cardExpiry}
                    onChange={(event) => setFormValues((current) => ({ ...current, cardExpiry: event.target.value }))}
                    className="bookshop-input"
                    placeholder="MM / YY"
                  />
                  <input
                    required
                    value={formValues.cardCvc}
                    onChange={(event) => setFormValues((current) => ({ ...current, cardCvc: event.target.value }))}
                    className="bookshop-input"
                    placeholder="CVC"
                  />
                </div>
              </div>
            </div>

            {error ? (
              <div className="rounded-[1.25rem] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-200">
                {error}
              </div>
            ) : null}

            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={isPlacingOrder}
                className="bookshop-button-primary px-6 py-3 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isPlacingOrder ? 'Preparing checkout...' : 'Continue to secure checkout'}
              </button>
              <Link href="/books" className="bookshop-button-quiet px-6 py-3">
                Continue shopping
              </Link>
            </div>
          </div>
        </form>

        <aside className="rounded-3xl border border-slate-200 border-l-8 border-l-emerald-600 bg-white px-8 py-7 shadow-sm sm:px-10 dark:border-slate-700 dark:border-l-emerald-500 dark:bg-slate-900">
          <h2 className="text-lg font-semibold text-[var(--bookshop-text)]">Order summary</h2>
          <div className="mt-6 space-y-4">
            {items.length === 0 ? (
              <p className="text-sm text-[var(--bookshop-muted)]">Your cart is empty. Add books to continue.</p>
            ) : (
              items.map((item) => (
                <div key={item.book.id} className="bookshop-subcard flex items-center justify-between p-4 text-sm text-[var(--bookshop-text)]">
                  <span>
                    {item.book.title} ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â {item.quantity}
                  </span>
                  <span>${(item.book.price * item.quantity).toFixed(2)}</span>
                </div>
              ))
            )}
          </div>

          <div className="mt-8 space-y-3 border-t border-[var(--bookshop-border)] pt-6 text-sm text-[var(--bookshop-muted)]">
            <div className="flex items-center justify-between">
              <span>Subtotal</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Shipping</span>
              <span>Free</span>
            </div>
            <div className="flex items-center justify-between text-base font-semibold text-[var(--bookshop-text)]">
              <span>Total</span>
              <span>${total.toFixed(2)}</span>
            </div>
          </div>

          <button
            onClick={clearCart}
            className="mt-8 text-sm font-medium text-violet-700 hover:underline dark:text-violet-300"
          >
            Clear cart
          </button>
        </aside>
      </div>
    </div>
  );
}
