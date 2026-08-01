'use client';

import Link from 'next/link';
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAccount } from '@/src/context/AccountContext';
import { getOrdersStorageKey, PROFILE_STORAGE_KEY, SESSION_STORAGE_KEY } from '@/src/context/AccountContext';
import type { AccountOrder } from '@/src/types/account';

function CheckoutSuccessContent() {
  const searchParams = useSearchParams();
  const { profile, orders } = useAccount();
  const sessionId = searchParams.get('session_id');
  const isDemo = searchParams.get('demo') === '1';
  const initialState = isDemo
    ? { status: 'success' as const, message: 'Your demo checkout is complete. Your library will unlock as soon as you refresh the page.' }
    : sessionId
      ? { status: 'loading' as const, message: 'Completing your purchase and unlocking your books…' }
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
            window.localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
            window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({ profile }));
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
    <main className="min-h-screen bg-[var(--bookshop-bg)] px-4 py-24">
      <div className="bookshop-card bookshop-shell-tight p-10">
        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-emerald-700 dark:text-emerald-300">
          {status === 'loading' ? 'Processing' : status === 'success' ? 'Payment confirmed' : 'Payment issue'}
        </p>
        <h1 className="mt-4 text-3xl font-semibold text-[var(--bookshop-text)]">
          {status === 'success' ? 'Your Bookshop purchase is ready' : 'Almost there'}
        </h1>
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
    <Suspense fallback={<main className="min-h-screen bg-[var(--bookshop-bg)] px-4 py-24"><div className="bookshop-card bookshop-shell-tight p-10"><p className="text-sm font-semibold uppercase tracking-[0.25em] text-emerald-700 dark:text-emerald-300">Processing</p><h1 className="mt-4 text-3xl font-semibold text-[var(--bookshop-text)]">Preparing your purchase confirmation…</h1></div></main>}>
      <CheckoutSuccessContent />
    </Suspense>
  );
}
