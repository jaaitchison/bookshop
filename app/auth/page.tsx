'use client';

import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAccount } from '@/src/context/AccountContext';

export default function AuthPage() {
  const router = useRouter();
  const { isAuthenticated, authError, clearAuthError, signIn, signUp } = useAccount();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [formValues, setFormValues] = useState({
    name: '',
    username: '',
    email: 'maya@example.com',
    password: 'bookshop',
  });

  useEffect(() => {
    if (isAuthenticated) {
      router.replace('/account');
    }
  }, [isAuthenticated, router]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    clearAuthError();

    if (mode === 'signin') {
      const signedIn = signIn(formValues.email, formValues.password);
      if (!signedIn) {
        return;
      }
    } else {
      const signedUp = signUp({
        name: formValues.name,
        email: formValues.email,
        password: formValues.password,
        username: formValues.username,
      });

      if (!signedUp) {
        return;
      }
    }

    router.push('/account');
  };

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-16 dark:bg-gray-950 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-5xl flex-col gap-8 rounded-3xl border border-gray-200 bg-white p-8 shadow-sm dark:border-gray-800 dark:bg-gray-900 lg:flex-row lg:items-stretch">
        <div className="flex-1 rounded-3xl bg-gradient-to-br from-blue-600 to-purple-700 p-8 text-white">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-blue-100">Welcome back</p>
          <h1 className="mt-4 text-3xl font-semibold">Create a shared account for reading, writing, and managing your bookstore experience.</h1>
          <p className="mt-4 max-w-xl text-sm leading-7 text-blue-50/90">
            Sign in with the demo account or create a new one to unlock the reader dashboard, creator tools, and admin views from the same profile.
          </p>
          <div className="mt-8 rounded-2xl border border-white/20 bg-white/10 p-4 text-sm">
            <p className="font-semibold">Demo sign-in</p>
            <p className="mt-2">Email: maya@example.com</p>
            <p>Password: bookshop</p>
          </div>
        </div>

        <div className="flex-1">
          <div className="flex gap-2 rounded-full border border-gray-200 bg-gray-50 p-1 dark:border-gray-800 dark:bg-gray-950">
            <button
              type="button"
              onClick={() => {
                setMode('signin');
                clearAuthError();
              }}
              className={`flex-1 rounded-full px-4 py-2 text-sm font-semibold transition ${
                mode === 'signin'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
              }`}
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('signup');
                clearAuthError();
              }}
              className={`flex-1 rounded-full px-4 py-2 text-sm font-semibold transition ${
                mode === 'signup'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
              }`}
            >
              Create account
            </button>
          </div>

          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            {mode === 'signup' ? (
              <>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                  Full name
                  <input
                    required
                    value={formValues.name}
                    onChange={(event) => setFormValues((current) => ({ ...current, name: event.target.value }))}
                    className="mt-2 w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none ring-0 focus:border-blue-500 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                    placeholder="Maya Chen"
                  />
                </label>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                  Username
                  <input
                    value={formValues.username}
                    onChange={(event) => setFormValues((current) => ({ ...current, username: event.target.value }))}
                    className="mt-2 w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none ring-0 focus:border-blue-500 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                    placeholder="maya-reads"
                  />
                </label>
              </>
            ) : null}

            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
              Email
              <input
                required
                type="email"
                value={formValues.email}
                onChange={(event) => setFormValues((current) => ({ ...current, email: event.target.value }))}
                className="mt-2 w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none ring-0 focus:border-blue-500 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                placeholder="you@example.com"
              />
            </label>

            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
              Password
              <input
                required
                type="password"
                value={formValues.password}
                onChange={(event) => setFormValues((current) => ({ ...current, password: event.target.value }))}
                className="mt-2 w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none ring-0 focus:border-blue-500 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                placeholder="Choose a password"
              />
            </label>

            {authError ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
                {authError}
              </div>
            ) : null}

            <button
              type="submit"
              className="w-full rounded-full bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              {mode === 'signin' ? 'Continue to account' : 'Create free account'}
            </button>
          </form>

          <p className="mt-6 text-sm text-gray-600 dark:text-gray-400">
            Need a quick preview? Visit <Link href="/account" className="font-semibold text-blue-600 dark:text-blue-400">the account hub</Link> after signing in.
          </p>
        </div>
      </div>
    </main>
  );
}
