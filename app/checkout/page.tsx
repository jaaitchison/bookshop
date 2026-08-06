'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { useAccount } from '@/src/context/AccountContext';
import { useCart } from '@/src/context/CartContext';
import { StripePaymentForm } from '@/src/components/checkout/StripePaymentForm';
import type { CheckoutInitialization } from '@/src/types/checkout';
import { formatGbp } from '@/src/lib/currency';

const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
const stripePromise = publishableKey ? loadStripe(publishableKey) : null;

const initialFormValues = {
  fullName: '',
  email: '',
  address: '',
  city: '',
  postcode: '',
};

export default function CheckoutPage() {
  const router = useRouter();
  const { items, subtotal, clearCart, isLoading: isCartLoading, isUpdating: isCartUpdating } = useCart();
  const { isAuthenticated } = useAccount();
  const [formValues, setFormValues] = useState(initialFormValues);
  const [checkout, setCheckout] = useState<CheckoutInitialization | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPreparing, setIsPreparing] = useState(false);
  const [digitalConsent, setDigitalConsent] = useState(false);

  const preparePayment = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isAuthenticated) {
      router.push('/auth?redirect=/checkout');
      return;
    }
    if (!items.length) {
      setError('Your cart is empty. Add a book before checking out.');
      return;
    }
    if (!stripePromise) {
      setError('Secure payments are not configured for this environment.');
      return;
    }

    setIsPreparing(true);
    setError(null);
    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shipping: {
            name: formValues.fullName,
            email: formValues.email,
            address: formValues.address,
            city: formValues.city,
            postcode: formValues.postcode,
          },
          digitalContentConsent: digitalConsent,
        }),
      });
      const payload = await response.json() as {
        checkout?: CheckoutInitialization;
        error?: string;
      };
      if (!response.ok || !payload.checkout) {
        throw new Error(payload.error ?? 'Secure payment initialization failed.');
      }
      setCheckout(payload.checkout);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Secure payment initialization failed.');
    } finally {
      setIsPreparing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bookshop-bg)] py-8">
      <div className="bookshop-shell grid gap-6 lg:grid-cols-[1.15fr,0.85fr]">
        <section className="rounded-3xl border border-slate-200 border-l-8 border-l-emerald-600 bg-white px-8 py-7 shadow-sm sm:px-10 dark:border-slate-700 dark:border-l-emerald-500 dark:bg-slate-900">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-violet-700 dark:text-violet-300">
            Secure checkout
          </p>
          <h2 className="mt-4 text-3xl font-bold text-[var(--bookshop-text)]">
            Confirm delivery and payment
          </h2>
          <p className="mt-3 text-lg text-[var(--bookshop-muted)]">
            Your books and prices are checked against the live catalogue before Stripe prepares payment.
          </p>

          <form onSubmit={preparePayment} className="mt-8 space-y-6">
            <div>
              <div className="flex items-center justify-between gap-4">
                <h3 className="text-lg font-semibold text-[var(--bookshop-text)]">Billing details</h3>
                {checkout ? (
                  <button
                    type="button"
                    onClick={() => setCheckout(null)}
                    className="text-sm font-semibold text-violet-700 hover:underline dark:text-violet-300"
                  >
                    Change details
                  </button>
                ) : null}
              </div>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <input
                  required
                  disabled={Boolean(checkout)}
                  value={formValues.fullName}
                  onChange={(event) => setFormValues((current) => ({ ...current, fullName: event.target.value }))}
                  className="bookshop-input disabled:opacity-70"
                  placeholder="Full name"
                  aria-label="Full name"
                />
                <input
                  required
                  disabled={Boolean(checkout)}
                  type="email"
                  value={formValues.email}
                  onChange={(event) => setFormValues((current) => ({ ...current, email: event.target.value }))}
                  className="bookshop-input disabled:opacity-70"
                  placeholder="Email address"
                  aria-label="Email address"
                />
                <input
                  required
                  disabled={Boolean(checkout)}
                  value={formValues.address}
                  onChange={(event) => setFormValues((current) => ({ ...current, address: event.target.value }))}
                  className="bookshop-input md:col-span-2 disabled:opacity-70"
                  placeholder="Street address"
                  aria-label="Street address"
                />
                <input
                  required
                  disabled={Boolean(checkout)}
                  value={formValues.city}
                  onChange={(event) => setFormValues((current) => ({ ...current, city: event.target.value }))}
                  className="bookshop-input disabled:opacity-70"
                  placeholder="City"
                  aria-label="City"
                />
                <input
                  required
                  disabled={Boolean(checkout)}
                  value={formValues.postcode}
                  onChange={(event) => setFormValues((current) => ({ ...current, postcode: event.target.value }))}
                  className="bookshop-input disabled:opacity-70"
                  placeholder="Postcode"
                  aria-label="Postcode"
                />
              </div>
            </div>

            {error ? (
              <div role="alert" className="rounded-[1.25rem] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-200">
                {error}
              </div>
            ) : null}

            {!checkout ? (
              <label className="flex items-start gap-3 rounded-[1.25rem] border border-[var(--bookshop-border)] p-4 text-sm leading-6 text-[var(--bookshop-muted)]">
                <input type="checkbox" required checked={digitalConsent} onChange={(event) => setDigitalConsent(event.target.checked)} className="mt-1" />
                <span>I agree to the <Link href="/terms" target="_blank">terms</Link> and <Link href="/refunds" target="_blank">refund policy</Link>, and request immediate supply of the digital books after payment.</span>
              </label>
            ) : null}

            {!checkout ? (
              <div className="flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={isPreparing || isCartLoading || isCartUpdating || items.length === 0 || !digitalConsent}
                  className="bookshop-button-primary px-6 py-3 disabled:cursor-wait disabled:opacity-70"
                >
                  {isPreparing ? 'Checking cart and prices...' : 'Continue to Stripe payment'}
                </button>
                <Link href="/books" className="bookshop-button-quiet px-6 py-3">
                  Continue shopping
                </Link>
              </div>
            ) : null}
          </form>

          {checkout && stripePromise ? (
            <div className="mt-8 border-t border-[var(--bookshop-border)] pt-7">
              <div className="rounded-[1.25rem] bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200">
                Server-verified payment amount: <strong>{formatGbp(checkout.amount)}</strong>
              </div>
              <Elements
                key={checkout.clientSecret}
                stripe={stripePromise}
                options={{
                  clientSecret: checkout.clientSecret,
                  appearance: { theme: 'stripe', variables: { borderRadius: '12px' } },
                }}
              >
                <StripePaymentForm
                  paymentIntentId={checkout.paymentIntentId}
                  amount={checkout.amount}
                  currency={checkout.currency}
                />
              </Elements>
            </div>
          ) : null}
        </section>

        <aside className="rounded-3xl border border-slate-200 border-l-8 border-l-emerald-600 bg-white px-8 py-7 shadow-sm sm:px-10 dark:border-slate-700 dark:border-l-emerald-500 dark:bg-slate-900">
          <h2 className="text-lg font-semibold text-[var(--bookshop-text)]">Order summary</h2>
          <div className="mt-6 space-y-4">
            {isCartLoading ? (
              <p className="text-sm text-[var(--bookshop-muted)]">Loading your saved cart...</p>
            ) : items.length === 0 ? (
              <p className="text-sm text-[var(--bookshop-muted)]">Your cart is empty. Add books to continue.</p>
            ) : (
              items.map((item) => (
                <div key={item.book.id} className="bookshop-subcard flex items-center justify-between gap-4 p-4 text-sm text-[var(--bookshop-text)]">
                  <span>{item.book.title} × {item.quantity}</span>
                  <span>{formatGbp(item.lineTotal)}</span>
                </div>
              ))
            )}
          </div>

          <div className="mt-8 space-y-3 border-t border-[var(--bookshop-border)] pt-6 text-sm text-[var(--bookshop-muted)]">
            <div className="flex items-center justify-between">
              <span>Server cart subtotal</span>
              <span>{formatGbp(subtotal)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Delivery</span>
              <span>Free</span>
            </div>
            <div className="flex items-center justify-between text-base font-semibold text-[var(--bookshop-text)]">
              <span>Displayed total</span>
              <span>{formatGbp(subtotal)}</span>
            </div>
          </div>

          <button
            type="button"
            disabled={Boolean(checkout) || isCartUpdating || items.length === 0}
            onClick={() => void clearCart()}
            className="mt-8 text-sm font-medium text-violet-700 hover:underline disabled:cursor-not-allowed disabled:opacity-50 dark:text-violet-300"
          >
            Clear cart
          </button>
        </aside>
      </div>
    </div>
  );
}
