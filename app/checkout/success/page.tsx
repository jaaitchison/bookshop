'use client';

import Link from 'next/link';
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAccount } from '@/src/context/AccountContext';
import { getOrdersStorageKey } from '@/src/context/AccountContext';
import type { AccountOrder } from '@/src/types/account';

function CheckoutSuccessContent() {
  const searchParams = useSearchParams();
  const { profile, orders } = useAccount();
  const sessionId = searchParams.get('session_id');
  const isDemo = searchParams.get('demo') === '1';
  const initialState = isDemo
    ? { status: 'success' as const, message: 'Your demo checkout is complete. Your library will unlock as soon as you refresh the page.' }
    : sessionId
      ? { status: 'loading' as const, message: 'Completing your purchase and unlocking your booksÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¦' }
      : { status: 'error' as const, message: 'We could not confirm your Stripe session. Please try the checkout flow again.' };
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>(initialState.status);
  const [message, setMessage] = useState(initialState.message);

  useEffect(() => {
    if (isDemo || !sessionId) {
      return;
    }

    const completeCheckout = async () => {
      const maxAttempts = 8;
      try {
        for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
          const response = await fetch(`/api/stripe/checkout/success?session_id=${encodeURIComponent(sessionId)}`);
          const payload = await response.json() as {
            ok?: boolean;
            error?: string;
            message?: string;
            pending?: boolean;
            orderId?: string;
            order?: AccountOrder;
          };

          if (response.status === 202 && payload.pending) {
            if (payload.message) {
              setMessage(payload.message);
            }

            if (attempt === maxAttempts - 1) {
              setStatus('error');
              setMessage('Payment is confirmed but fulfillment is still pending. Please refresh your account in a few moments.');
              return;
            }

            await new Promise((resolve) => setTimeout(resolve, 1500));
            continue;
          }

          if (!response.ok || !payload.ok) {
            setStatus('error');
            setMessage(payload.error ?? 'We could not verify the payment.');
            return;
          }

          if (payload.order) {
            const nextOrders = [payload.order, ...orders.filter((existing) => existing.id !== payload.order?.id)];
            const storageKey = getOrdersStorageKey(profile.id);
            window.localStorage.setItem(storageKey, JSON.stringify(nextOrders));
            window.dispatchEvent(new Event('bookshop-account-updated'));
          }

          setStatus('success');
          setMessage(`Your payment was confirmed and your order ${payload.orderId ?? 'is'} is now ready to access.`);
          return;
        }
      } catch {
        setStatus('error');
        setMessage('We could not verify the payment session. Please check your account history.');
      }
    };

    void completeCheckout();
  }, [isDemo, orders, profile, sessionId]);

  return (
    <main className="min-h-screen bg-[var(--bookshop-bg)] py-8">
      <div className="mx-auto w-11/12 rounded-3xl border border-slate-200 border-l-8 border-l-emerald-600 bg-white px-8 py-7 shadow-sm sm:w-10/12 sm:px-10 lg:w-4/5 dark:border-slate-700 dark:border-l-emerald-500 dark:bg-slate-900">
        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-emerald-700 dark:text-emerald-300">
          {status === 'loading' ? 'Processing' : status === 'success' ? 'Payment confirmed' : 'Payment issue'}
        </p>
        <h2 className="mt-4 text-3xl font-semibold text-[var(--bookshop-text)]">
          {status === 'success' ? 'Your Bookshop purchase is ready' : 'Almost there'}
        </h2>
        <p className="mt-4 text-[var(--bookshop-muted)]">{message}</p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/library" className="bookshop-button-primary px-5 py-2.5 text-sm">
            Open my library
          </Link>
          <Link href="/account" className="bookshop-button-quiet px-5 py-2.5 text-sm">
            View account dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-[var(--bookshop-bg)] py-8"><div className="mx-auto w-11/12 rounded-3xl border border-slate-200 border-l-8 border-l-emerald-600 bg-white px-8 py-7 shadow-sm sm:w-10/12 sm:px-10 lg:w-4/5 dark:border-slate-700 dark:border-l-emerald-500 dark:bg-slate-900"><p className="text-sm font-semibold uppercase tracking-[0.25em] text-emerald-700 dark:text-emerald-300">Processing</p><h2 className="mt-4 text-3xl font-semibold text-[var(--bookshop-text)]">Preparing your purchase confirmationÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¦</h2></div></main>}>
      <CheckoutSuccessContent />
    </Suspense>
  );
}
