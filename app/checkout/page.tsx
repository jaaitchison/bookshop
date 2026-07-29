import Link from 'next/link';

export default function CheckoutPage() {
  return (
    <div className="min-h-screen bg-gray-50 px-4 py-24 dark:bg-gray-950">
      <div className="mx-auto max-w-3xl rounded-2xl border border-gray-200 bg-white p-10 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-600 dark:text-blue-400">
          Checkout preview
        </p>
        <h1 className="mt-4 text-3xl font-bold text-gray-900 dark:text-gray-100">
          Checkout experience coming soon
        </h1>
        <p className="mt-4 text-lg text-gray-600 dark:text-gray-400">
          This placeholder page is ready for the next step: shipping, payment, and order confirmation.
        </p>
        <Link href="/books" className="mt-8 inline-flex rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700">
          Continue shopping
        </Link>
      </div>
    </div>
  );
}
