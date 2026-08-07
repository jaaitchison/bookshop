'use client';

import Link from 'next/link';
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAccount } from '@/src/context/AccountContext';
import { useCart } from '@/src/context/CartContext';
import type { PaymentAttemptState } from '@/src/types/checkout';

function CheckoutSuccessContent() {
  const searchParams = useSearchParams();
  const paymentIntentId = searchParams.get('payment_intent');
  const redirectStatus = searchParams.get('redirect_status');
  const { refreshOrders } = useAccount();
  const { refreshCart } = useCart();
  const redirectedFailure = redirectStatus === 'failed' || redirectStatus === 'requires_payment_method';
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>(
    paymentIntentId && !redirectedFailure ? 'loading' : 'error',
  );
  const [message, setMessage] = useState(
    redirectedFailure
      ? 'Stripe could not complete this payment. Return to checkout to try another payment method.'
      : paymentIntentId
      ? 'Stripe has returned your payment. Waiting for the signed webhook confirmation...'
      : 'This page is missing its PaymentIntent reference. Return to checkout and try again.',
  );

  useEffect(() => {
    if (!paymentIntentId || redirectedFailure) return;

    let active = true;
    const checkStatus = async () => {
      const maxAttempts = 10;
      for (let attemptNumber = 0; attemptNumber < maxAttempts && active; attemptNumber += 1) {
        try {
          const response = await fetch(
            `/api/checkout/status?payment_intent=${encodeURIComponent(paymentIntentId)}`,
            { credentials: 'include', cache: 'no-store' },
          );
          const payload = await response.json() as {
            attempt?: {
              status: PaymentAttemptState;
              failureMessage: string;
              orderId: string | null;
            };
            error?: string;
          };
          if (!response.ok || !payload.attempt) {
            setStatus('error');
            setMessage(payload.error ?? 'We could not verify this payment attempt.');
            return;
          }
          if (payload.attempt.status === 'SUCCEEDED' && payload.attempt.orderId) {
            await Promise.all([refreshOrders(), refreshCart()]);
            setStatus('success');
            setMessage('Your payment is verified, your order is recorded, and your books are ready in your library.');
            return;
          }
          if (payload.attempt.status === 'FAILED' || payload.attempt.status === 'CANCELLED') {
            setStatus('error');
            setMessage(payload.attempt.failureMessage || 'This payment was not completed.');
            return;
          }
          setMessage('Payment is processing. Waiting for Stripe’s signed confirmation...');
          if (attemptNumber < maxAttempts - 1) {
            await new Promise((resolve) => setTimeout(resolve, 1500));
          }
        } catch {
          setStatus('error');
          setMessage('We could not check the payment status. Your account has not been charged twice; please try again shortly.');
          return;
        }
      }
      if (active) {
        setStatus('error');
        setMessage('Payment confirmation is taking longer than expected. Check your account again in a few moments.');
      }
    };

    void checkStatus();
    return () => {
      active = false;
    };
  }, [paymentIntentId, redirectedFailure, refreshCart, refreshOrders]);

  return (
    <main className="min-h-screen bg-[var(--bookshop-bg)] py-8">
      <div className="mx-auto w-11/12 rounded-3xl border border-slate-200 border-l-8 border-l-emerald-600 bg-white px-8 py-7 shadow-sm sm:w-10/12 sm:px-10 lg:w-4/5 dark:border-slate-700 dark:border-l-emerald-500 dark:bg-slate-900">
        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-emerald-700 dark:text-emerald-300">
          {status === 'loading' ? 'Verifying payment' : status === 'success' ? 'Payment confirmed' : 'Payment issue'}
        </p>
        <h2 className="mt-4 text-3xl font-semibold text-[var(--bookshop-text)]">
          {status === 'success' ? 'Stripe confirmed your payment' : 'Secure checkout status'}
        </h2>
        <p className="mt-4 text-[var(--bookshop-muted)]">{message}</p>

        <div className="mt-8 flex flex-wrap gap-3">
          {status === 'error' ? (
            <Link href="/checkout" className="bookshop-button-primary px-5 py-2.5 text-sm">
              Return to checkout
            </Link>
          ) : null}
          <Link href="/account" className="bookshop-button-quiet px-5 py-2.5 text-sm">
            View account dashboard
          </Link>
          {status === 'success' ? (
            <Link href="/library" className="bookshop-button-primary px-5 py-2.5 text-sm">
              Open your library
            </Link>
          ) : null}
        </div>
      </div>
    </main>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-[var(--bookshop-bg)] py-8"><div className="mx-auto w-11/12 rounded-3xl border border-slate-200 border-l-8 border-l-emerald-600 bg-white px-8 py-7 shadow-sm sm:w-10/12 sm:px-10 lg:w-4/5 dark:border-slate-700 dark:border-l-emerald-500 dark:bg-slate-900"><p className="text-sm font-semibold uppercase tracking-[0.25em] text-emerald-700 dark:text-emerald-300">Verifying payment</p><h2 className="mt-4 text-3xl font-semibold text-[var(--bookshop-text)]">Waiting for Stripe confirmation...</h2></div></main>}>
      <CheckoutSuccessContent />
    </Suspense>
  );
}
