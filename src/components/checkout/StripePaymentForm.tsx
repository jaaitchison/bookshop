'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { formatGbp } from '@/src/lib/currency';

interface StripePaymentFormProps {
  paymentIntentId: string;
  amount: number;
  currency: string;
}

export function StripePaymentForm({
  paymentIntentId,
  amount,
}: StripePaymentFormProps) {
  const router = useRouter();
  const stripe = useStripe();
  const elements = useElements();
  const [isConfirming, setIsConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const confirmPayment = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!stripe || !elements) return;

    setIsConfirming(true);
    setError(null);
    const result = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/checkout/success`,
      },
      redirect: 'if_required',
    });

    if (result.error) {
      setError(result.error.message ?? 'Stripe could not confirm this payment.');
      setIsConfirming(false);
      return;
    }

    if (result.paymentIntent) {
      const status = encodeURIComponent(result.paymentIntent.status);
      router.push(
        `/checkout/success?payment_intent=${encodeURIComponent(paymentIntentId)}&redirect_status=${status}`,
      );
      return;
    }

    setError('Stripe did not return a payment result. Please try again.');
    setIsConfirming(false);
  };

  return (
    <form onSubmit={confirmPayment} className="mt-6 space-y-5">
      <div className="rounded-[1.25rem] border border-[var(--bookshop-border)] bg-white p-4 dark:bg-slate-950">
        <PaymentElement options={{ layout: 'tabs' }} />
      </div>
      {error ? (
        <div role="alert" className="rounded-[1.25rem] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-200">
          {error}
        </div>
      ) : null}
      <button
        type="submit"
        disabled={!stripe || !elements || isConfirming}
        className="bookshop-button-primary w-full px-6 py-3 disabled:cursor-wait disabled:opacity-70"
      >
        {isConfirming
          ? 'Confirming secure payment...'
          : `Pay ${formatGbp(amount)}`}
      </button>
      <p className="text-xs leading-5 text-[var(--bookshop-muted)]">
        Payment details are collected and tokenised by Stripe. Bookshop never receives or stores your card number.
      </p>
    </form>
  );
}
