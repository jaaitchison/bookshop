'use client';

import Link from 'next/link';
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

function CheckoutSuccessContent() {
  const searchParams = useSearchParams();
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
      try {
        const response = await fetch(`/api/stripe/checkout/success?session_id=${encodeURIComponent(sessionId)}`);
        const payload = await response.json() as { ok?: boolean; error?: string; orderId?: string };

        if (!response.ok || !payload.ok) {
          setStatus('error');
          setMessage(payload.error ?? 'We could not verify the payment.');
          return;
        }

        setStatus('success');
        setMessage(`Your payment was confirmed and your order ${payload.orderId ?? 'is'} is now ready to access.`);
      } catch {
        setStatus('error');
        setMessage('We could not verify the payment session. Please check your account history.');
      }
    };

    void completeCheckout();
  }, [isDemo, sessionId]);

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-24 dark:bg-gray-950">
      <div className="mx-auto max-w-3xl rounded-3xl border border-gray-200 bg-white p-10 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-emerald-600 dark:text-emerald-400">
          {status === 'loading' ? 'Processing' : status === 'success' ? 'Payment confirmed' : 'Payment issue'}
        </p>
        <h1 className="mt-4 text-3xl font-semibold text-gray-900 dark:text-white">
          {status === 'success' ? 'Your Bookshop purchase is ready' : 'Almost there'}
        </h1>
        <p className="mt-4 text-gray-600 dark:text-gray-400">{message}</p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/library" className="rounded-full bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700">
            Open my library
          </Link>
          <Link href="/account" className="rounded-full border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-100 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800">
            View account dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-gray-50 px-4 py-24 dark:bg-gray-950"><div className="mx-auto max-w-3xl rounded-3xl border border-gray-200 bg-white p-10 shadow-sm dark:border-gray-800 dark:bg-gray-900"><p className="text-sm font-semibold uppercase tracking-[0.25em] text-emerald-600 dark:text-emerald-400">Processing</p><h1 className="mt-4 text-3xl font-semibold text-gray-900 dark:text-white">Preparing your purchase confirmation…</h1></div></main>}>
      <CheckoutSuccessContent />
    </Suspense>
  );
}
