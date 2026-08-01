'use client';

import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAccount } from '@/src/context/AccountContext';

const socialProviders = [
  { name: 'Google', description: 'Coming soon' },
  { name: 'Microsoft', description: 'Coming soon' },
  { name: 'Apple', description: 'Coming soon' },
];

export default function AuthPage() {
  const router = useRouter();
  const { isAuthenticated, authError, clearAuthError, signIn, signUp } = useAccount();
  const [redirectTarget] = useState(() => {
    if (typeof window === 'undefined') {
      return '/account';
    }

    const requestedRedirect = new URLSearchParams(window.location.search).get('redirect');
    return requestedRedirect && requestedRedirect.startsWith('/') ? requestedRedirect : '/account';
  });
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [formValues, setFormValues] = useState({
    name: '',
    username: '',
    email: 'maya@example.com',
    password: 'bookshop',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      router.replace(redirectTarget);
    }
  }, [isAuthenticated, redirectTarget, router]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    clearAuthError();
    setIsSubmitting(true);

    const credentials = {
      name: formValues.name,
      email: formValues.email,
      password: formValues.password,
      username: formValues.username,
    };

    const success = mode === 'signin'
      ? await signIn(credentials.email, credentials.password)
      : await signUp(credentials);

    setIsSubmitting(false);

    if (!success) {
      return;
    }

    router.push(redirectTarget);
  };

  return (
    <main className="min-h-screen bg-[var(--bookshop-bg)] py-8">
      <div className="mx-auto w-11/12 sm:w-10/12 lg:w-4/5">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-stretch">
          <div className="flex-1 rounded-3xl border border-slate-200 border-l-8 border-l-emerald-600 bg-white px-8 py-7 shadow-sm sm:px-10 dark:border-slate-700 dark:border-l-emerald-500 dark:bg-slate-900">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-violet-700 dark:text-violet-300">Welcome back</p>
            <h2 className="mt-4 text-3xl font-semibold text-[var(--bookshop-text)]">Create a shared account for reading, writing, and managing your bookstore experience.</h2>
            <p className="mt-4 max-w-xl text-sm leading-7 text-[var(--bookshop-muted)]">
              Sign in with the demo account or create a new one to unlock the reader dashboard, creator tools, and admin views from the same profile.
            </p>
            <div className="mt-8 rounded-[1.5rem] border border-[var(--bookshop-border)] bg-[var(--bookshop-surface-muted)] p-4 text-sm text-[var(--bookshop-text)]">
              <p className="font-semibold">Demo sign-in</p>
              <p className="mt-2">Email: maya@example.com</p>
              <p>Password: bookshop</p>
            </div>
          </div>

          <div className="flex-1 rounded-3xl border border-slate-200 border-l-8 border-l-emerald-600 bg-white px-8 py-7 shadow-sm sm:px-10 dark:border-slate-700 dark:border-l-emerald-500 dark:bg-slate-900">
            <div className="flex gap-2 rounded-full border border-[var(--bookshop-border)] bg-[var(--bookshop-surface-muted)] p-1">
              <button
                type="button"
                onClick={() => {
                  setMode('signin');
                  clearAuthError();
                }}
                className={`flex-1 rounded-full px-4 py-2 text-sm font-semibold transition ${
                  mode === 'signin'
                    ? 'bg-violet-700 text-white'
                    : 'text-[var(--bookshop-muted)] hover:bg-[var(--bookshop-surface)]'
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
                    ? 'bg-violet-700 text-white'
                    : 'text-[var(--bookshop-muted)] hover:bg-[var(--bookshop-surface)]'
                }`}
              >
                Create account
              </button>
            </div>

            <div className="mt-6 rounded-[1.5rem] border border-[var(--bookshop-border)] bg-[var(--bookshop-surface-muted)] p-4">
              <p className="text-sm font-semibold text-[var(--bookshop-text)]">Prefer a social sign-in?</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                {socialProviders.map((provider) => (
                  <button
                    key={provider.name}
                    type="button"
                    disabled
                    className="rounded-[1rem] border border-[var(--bookshop-border)] bg-[var(--bookshop-surface)] px-3 py-3 text-left text-sm font-medium text-[var(--bookshop-text)] transition hover:border-violet-300"
                  >
                    <p>{provider.name}</p>
                    <p className="mt-1 text-xs uppercase tracking-[0.2em] text-[var(--bookshop-muted)]">{provider.description}</p>
                  </button>
                ))}
              </div>
              <p className="mt-3 text-sm text-[var(--bookshop-muted)]">
                OAuth providers will connect to your Bookshop profile once the next authentication pass is live.
              </p>
            </div>

            <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
              {mode === 'signup' ? (
                <>
                  <label className="block text-sm font-medium text-[var(--bookshop-text)]">
                    Full name
                    <input
                      required
                      value={formValues.name}
                      onChange={(event) => setFormValues((current) => ({ ...current, name: event.target.value }))}
                      className="bookshop-input mt-2"
                      placeholder="Maya Chen"
                    />
                  </label>
                  <label className="block text-sm font-medium text-[var(--bookshop-text)]">
                    Username
                    <input
                      value={formValues.username}
                      onChange={(event) => setFormValues((current) => ({ ...current, username: event.target.value }))}
                      className="bookshop-input mt-2"
                      placeholder="maya-reads"
                    />
                  </label>
                </>
              ) : null}

              <label className="block text-sm font-medium text-[var(--bookshop-text)]">
                Email
                <input
                  required
                  type="email"
                  value={formValues.email}
                  onChange={(event) => setFormValues((current) => ({ ...current, email: event.target.value }))}
                  className="bookshop-input mt-2"
                  placeholder="you@example.com"
                />
              </label>

              <label className="block text-sm font-medium text-[var(--bookshop-text)]">
                Password
                <input
                  required
                  type="password"
                  value={formValues.password}
                  onChange={(event) => setFormValues((current) => ({ ...current, password: event.target.value }))}
                  className="bookshop-input mt-2"
                  placeholder="Choose a password"
                />
              </label>

              {authError ? (
                <div className="rounded-[1.25rem] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-200">
                  {authError}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={isSubmitting}
                className="bookshop-button-primary w-full px-4 py-3 text-sm disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSubmitting ? (mode === 'signin' ? 'Signing in...' : 'Creating account...') : mode === 'signin' ? 'Continue to account' : 'Create free account'}
              </button>
            </form>

            <p className="mt-6 text-sm text-[var(--bookshop-muted)]">
              Need a quick preview? Visit <Link href="/account" className="font-semibold text-violet-700 dark:text-violet-300">the account hub</Link> after signing in.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
