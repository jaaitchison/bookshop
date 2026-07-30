'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';
import { getOrdersStorageKey, useAccount } from '@/src/context/AccountContext';
import { accountActivity, accountLibrary, getPersonalizedNotifications } from '@/src/data/account';
import { mockBooks } from '@/src/data/books';
import type { AccountOrder, SocialProvider } from '@/src/types/account';

type GoalOption = {
  id: 'reading' | 'writing' | 'both';
  label: string;
  description: string;
};

const goalOptions: GoalOption[] = [
  {
    id: 'reading',
    label: 'Reading',
    description: 'Browse, buy, and enjoy books with a personal library.',
  },
  {
    id: 'writing',
    label: 'Writing',
    description: 'Publish books, manage drafts, and track audience growth.',
  },
  {
    id: 'both',
    label: 'Both',
    description: 'Blend reader habits with creator tools in one experience.',
  },
];

const socialProviders: SocialProvider[] = ['Google', 'Microsoft', 'Apple'];

export default function AccountPage() {
  const {
    profile,
    setGoals,
    completeOnboarding,
    toggleWriter,
    toggleAdmin,
    setActiveRole,
    hasRole,
    isAuthenticated,
    orders,
    updateProfile,
  } = useAccount();
  const [wishlistCount, setWishlistCount] = useState(0);

  const toggleGoal = (goal: 'reading' | 'writing' | 'both') => {
    const nextGoals = profile.goals.includes(goal)
      ? profile.goals.filter((item) => item !== goal)
      : [...profile.goals, goal];

    setGoals(nextGoals);
  };

  const toggleSocialProvider = (provider: SocialProvider) => {
    const nextProviders = profile.connectedSocials.includes(provider)
      ? profile.connectedSocials.filter((item) => item !== provider)
      : [...profile.connectedSocials, provider];

    updateProfile({ connectedSocials: nextProviders });
  };

  const toggleMfa = () => {
    const nextEnabled = !profile.mfaEnabled;
    updateProfile({
      mfaEnabled: nextEnabled,
      mfaMethod: nextEnabled ? 'Authenticator app' : 'Not enabled',
    });
  };

  useEffect(() => {
    const loadWishlist = async () => {
      try {
        const response = await fetch('/api/wishlist');
        const data = await response.json() as { items?: string[] };
        setWishlistCount((data.items ?? []).length);
      } catch {
        setWishlistCount(0);
      }
    };

    void loadWishlist();
  }, []);

  const resolvedOrders = useMemo(() => {
    if (orders.length > 0) {
      return orders;
    }

    if (typeof window === 'undefined' || !profile.id) {
      return [] as AccountOrder[];
    }

    try {
      const storedValue = window.localStorage.getItem(getOrdersStorageKey(profile.id));
      if (!storedValue) {
        return [] as AccountOrder[];
      }

      const parsed = JSON.parse(storedValue) as AccountOrder[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [] as AccountOrder[];
    }
  }, [orders, profile.id]);

  const notifications = useMemo(() => getPersonalizedNotifications(profile, resolvedOrders), [profile, resolvedOrders]);
  const libraryItems = useMemo(() => {
    const purchased = resolvedOrders.flatMap((order) => order.items).reduce<Record<string, typeof accountLibrary[number]>>((acc, item) => {
      if (!acc[item.id]) {
        const bookDetails = mockBooks.find((book) => book.id === item.id);
        acc[item.id] = {
          id: item.id,
          title: item.title,
          author: item.author,
          cover: bookDetails?.cover ?? '/logo.jpg',
          status: 'Purchased',
          progress: `${item.quantity} copy${item.quantity === 1 ? '' : 'ies'} purchased`,
        };
      }
      return acc;
    }, {});

    const orderedBooks = Object.values(purchased);
    return orderedBooks.length > 0 ? orderedBooks : accountLibrary;
  }, [resolvedOrders]);
  const readinessHighlights = useMemo(() => {
    const items: string[] = [];

    if (!profile.onboardingComplete) {
      items.push('Finish your onboarding choices to unlock the best role-based recommendations.');
    }

    if (profile.roles.writer) {
      items.push('Writer tools are active, so your studio and publishing updates are ready to explore.');
    }

    if (profile.roles.admin) {
      items.push('Admin shortcuts are enabled for moderation and platform oversight.');
    }

    if (resolvedOrders.length > 0) {
      items.push(`Your account now carries ${resolvedOrders.length} saved order${resolvedOrders.length === 1 ? '' : 's'} for quick reference.`);
    }

    if (items.length === 0) {
      items.push('Make a purchase or switch into creator mode to fill this dashboard with useful activity.');
    }

    return items;
  }, [profile.onboardingComplete, profile.roles.admin, profile.roles.writer, resolvedOrders.length]);

  if (!isAuthenticated) {
    return (
      <main className="min-h-screen bg-gray-50 px-4 py-16 dark:bg-gray-950 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl rounded-3xl border border-gray-200 bg-white p-10 text-center shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-blue-600 dark:text-blue-400">Secure access</p>
          <h1 className="mt-4 text-3xl font-semibold text-gray-900 dark:text-white">Sign in to unlock your account hub</h1>
          <p className="mt-4 text-gray-600 dark:text-gray-400">
            Your unified dashboard, library, and creator tools are available after authentication so your activity stays connected to one profile.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/auth" className="rounded-full bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700">
              Sign in or create an account
            </Link>
            <Link href="/books" className="rounded-full border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-100 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800">
              Continue browsing books
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
        <section className="rounded-3xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-8 shadow-sm">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-purple-600 text-xl font-semibold text-white">
                {profile.avatar}
              </div>
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.25em] text-blue-600 dark:text-blue-400">
                  Unified account
                </p>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{profile.name}</h1>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                  @{profile.username} • {profile.location} • Joined {profile.joined}
                </p>
              </div>
            </div>
            <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-200">
              <p className="font-semibold">Current view</p>
              <p className="mt-1 text-base font-medium capitalize">{profile.activeRole}</p>
            </div>
          </div>
          <div className="mt-6 rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-950/60">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-gray-500 dark:text-gray-400">
              Account readiness
            </p>
            <ul className="mt-3 space-y-2 text-sm text-gray-600 dark:text-gray-400">
              {readinessHighlights.map((item) => (
                <li key={item} className="flex gap-2">
                  <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-blue-500" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="grid gap-8 xl:grid-cols-[1.3fr_0.9fr]">
          <div className="space-y-6">
            <div className="rounded-3xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.25em] text-gray-500 dark:text-gray-400">
                    Verification status
                  </p>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                    {hasRole('writer') ? 'Verified creator profile' : hasRole('admin') ? 'Trusted admin profile' : 'Reader profile'}
                  </h2>
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                    {hasRole('writer')
                      ? 'Your creator identity is marked as verified and ready for publishing features.'
                      : hasRole('admin')
                        ? 'Your admin identity is tagged with elevated moderation access.'
                        : 'You are currently operating in reader mode with access to browsing and purchases.'}
                  </p>
                </div>
                <span className={`rounded-full px-3 py-1 text-sm font-semibold ${
                  hasRole('writer')
                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-200'
                    : hasRole('admin')
                      ? 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-200'
                      : 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-200'
                }`}>
                  {hasRole('writer') ? 'Verified writer' : hasRole('admin') ? 'Admin access' : 'Reader ready'}
                </span>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="rounded-full border border-gray-200 px-3 py-1 text-sm text-gray-700 dark:border-gray-800 dark:text-gray-300">
                  Unified account
                </span>
                {hasRole('writer') ? (
                  <span className="rounded-full border border-amber-200 px-3 py-1 text-sm text-amber-700 dark:border-amber-900 dark:text-amber-200">
                    Studio tools enabled
                  </span>
                ) : null}
                {hasRole('admin') ? (
                  <span className="rounded-full border border-red-200 px-3 py-1 text-sm text-red-700 dark:border-red-900 dark:text-red-200">
                    Moderation access
                  </span>
                ) : null}
              </div>
            </div>

            <div className="rounded-3xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.25em] text-gray-500 dark:text-gray-400">
                    Onboarding
                  </p>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                    How will you use Bookshop?
                  </h2>
                </div>
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200">
                  {profile.onboardingComplete ? 'Ready' : 'In progress'}
                </span>
              </div>
              <div className="mt-6 grid gap-3 md:grid-cols-3">
                {goalOptions.map((option) => {
                  const selected = profile.goals.includes(option.id);
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => toggleGoal(option.id)}
                      className={`rounded-2xl border p-4 text-left transition ${
                        selected
                          ? 'border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-950/40'
                          : 'border-gray-200 bg-white hover:border-gray-300 dark:border-gray-800 dark:bg-gray-900'
                      }`}
                    >
                      <p className="font-semibold text-gray-900 dark:text-white">{option.label}</p>
                      <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{option.description}</p>
                    </button>
                  );
                })}
              </div>
              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={completeOnboarding}
                  className="rounded-full bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
                >
                  Save onboarding profile
                </button>
                <button
                  type="button"
                  onClick={() => toggleWriter(true)}
                  className="rounded-full border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-100 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
                >
                  Enable creator mode
                </button>
              </div>
            </div>

            <div className="rounded-3xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.25em] text-gray-500 dark:text-gray-400">
                    Security & sign-in
                  </p>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Social login and MFA readiness</h2>
                </div>
                <span className={`rounded-full px-3 py-1 text-sm font-medium ${profile.mfaEnabled ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200' : 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-200'}`}>
                  {profile.mfaEnabled ? 'MFA enabled' : 'MFA pending'}
                </span>
              </div>
              <div className="mt-6 space-y-4">
                <div className="rounded-2xl border border-gray-200 p-4 dark:border-gray-800">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">Connected social providers</p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    {socialProviders.map((provider) => {
                      const connected = profile.connectedSocials.includes(provider);
                      return (
                        <button
                          key={provider}
                          type="button"
                          onClick={() => toggleSocialProvider(provider)}
                          className={`rounded-2xl border px-3 py-3 text-left text-sm font-medium transition ${connected ? 'border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-400 dark:bg-blue-950/40 dark:text-blue-200' : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200 dark:hover:border-gray-700'}`}
                        >
                          <p>{provider}</p>
                          <p className="mt-1 text-xs uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400">{connected ? 'Connected' : 'Available soon'}</p>
                        </button>
                      );
                    })}
                  </div>
                  <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">
                    Bookshop is preparing a full OAuth rollout for Google, Microsoft, and Apple sign-ins with a seamless handoff back to your account profile.
                  </p>
                </div>
                <div className="rounded-2xl border border-gray-200 p-4 dark:border-gray-800">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">Multi-factor authentication</p>
                      <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">Current method: {profile.mfaMethod}</p>
                    </div>
                    <button
                      type="button"
                      onClick={toggleMfa}
                      className={`rounded-full px-4 py-2 text-sm font-semibold transition ${profile.mfaEnabled ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-gray-900 text-white hover:bg-gray-700 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-200'}`}
                    >
                      {profile.mfaEnabled ? 'Disable MFA' : 'Enable MFA'}
                    </button>
                  </div>
                  <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">
                    The next iteration will add authenticator-app verification, passkey support, and recovery codes without disturbing your existing reader and writer workflows.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.25em] text-gray-500 dark:text-gray-400">
                    Role-based experience
                  </p>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Switch context instantly</h2>
                </div>
              </div>
              <div className="mt-6 grid gap-4 md:grid-cols-3">
                <div className="rounded-2xl border border-gray-200 p-4 dark:border-gray-800">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">Reader</p>
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Browse, buy, and revisit your library.</p>
                  <button
                    type="button"
                    onClick={() => setActiveRole('reader')}
                    className="mt-4 rounded-full bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-gray-700 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-200"
                  >
                    Open reader view
                  </button>
                </div>
                <div className="rounded-2xl border border-gray-200 p-4 dark:border-gray-800">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">Writer</p>
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Publish books and manage sales from one place.</p>
                  <button
                    type="button"
                    onClick={() => {
                      toggleWriter(true);
                      setActiveRole('writer');
                    }}
                    className="mt-4 rounded-full bg-amber-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-600"
                  >
                    {hasRole('writer') ? 'Open creator view' : 'Enable writer mode'}
                  </button>
                </div>
                <div className="rounded-2xl border border-gray-200 p-4 dark:border-gray-800">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">Admin</p>
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Moderate reviews and guide platform operations.</p>
                  <button
                    type="button"
                    onClick={() => {
                      toggleAdmin(true);
                      setActiveRole('admin');
                    }}
                    className="mt-4 rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
                  >
                    {hasRole('admin') ? 'Open admin view' : 'Enable admin access'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-3xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Notifications</h2>
                <span className="rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                  {notifications.filter((notification) => notification.unread).length} unread
                </span>
              </div>
              <div className="mt-6 space-y-3">
                {notifications.map((notification) => (
                  <div key={notification.id} className="rounded-2xl border border-gray-200 p-4 dark:border-gray-800">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">{notification.title}</p>
                        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{notification.detail}</p>
                      </div>
                      {notification.unread ? (
                        <span className="rounded-full bg-blue-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-blue-700 dark:bg-blue-950/40 dark:text-blue-200">
                          New
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-3 text-xs uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400">
                      {notification.category} • {notification.timestamp}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Quick links</h2>
                <span className="rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                  Unified dashboard
                </span>
              </div>
              <div className="mt-6 space-y-3">
                <Link href="/library" className="flex items-center justify-between rounded-2xl border border-gray-200 p-4 transition hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800">
                  <span className="font-medium text-gray-900 dark:text-white">My library</span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">{libraryItems.length} saved items</span>
                </Link>
                <Link href="/books" className="flex items-center justify-between rounded-2xl border border-gray-200 p-4 transition hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800">
                  <span className="font-medium text-gray-900 dark:text-white">Explore books</span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">Search & filter</span>
                </Link>
                <Link href="/books" className="flex items-center justify-between rounded-2xl border border-gray-200 p-4 transition hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800">
                  <span className="font-medium text-gray-900 dark:text-white">Saved wishlist</span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">{wishlistCount} book{wishlistCount === 1 ? '' : 's'}</span>
                </Link>
                {hasRole('writer') ? (
                  <Link href="/studio" className="flex items-center justify-between rounded-2xl border border-gray-200 p-4 transition hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800">
                    <span className="font-medium text-gray-900 dark:text-white">Creator Studio</span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">Manage releases</span>
                  </Link>
                ) : null}
                {hasRole('admin') ? (
                  <Link href="/admin" className="flex items-center justify-between rounded-2xl border border-gray-200 p-4 transition hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800">
                    <span className="font-medium text-gray-900 dark:text-white">Admin console</span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">Moderation tools</span>
                  </Link>
                ) : null}
              </div>
            </div>

            <div className="rounded-3xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Recent activity</h2>
              <div className="mt-4 space-y-3">
                {accountActivity.map((item) => (
                  <div key={item.title} className="rounded-2xl border border-gray-200 p-4 dark:border-gray-800">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{item.title}</p>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{item.detail}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-8 lg:grid-cols-2">
          <div className="rounded-3xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Your library</h2>
              <span className="text-sm text-gray-500 dark:text-gray-400">Reader view</span>
            </div>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {libraryItems.map((book) => (
                <div key={book.id} className="rounded-2xl border border-gray-200 p-4 dark:border-gray-800">
                  <div className="relative mb-3 h-32 overflow-hidden rounded-xl">
                    <Image src={book.cover} alt={book.title} fill className="object-cover" />
                  </div>
                  <p className="font-semibold text-gray-900 dark:text-white">{book.title}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{book.author}</p>
                  <p className="mt-2 text-sm text-blue-600 dark:text-blue-400">{book.status}</p>
                  {book.progress ? <p className="text-sm text-gray-500 dark:text-gray-400">{book.progress}</p> : null}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Order history</h2>
              <span className="text-sm text-gray-500 dark:text-gray-400">Signed-in purchases</span>
            </div>
            <div className="mt-6 space-y-4">
              {resolvedOrders.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-gray-200 p-4 text-sm text-gray-600 dark:border-gray-800 dark:text-gray-400">
                  No orders yet. Complete a purchase from the checkout page to see it here.
                </div>
              ) : (
                resolvedOrders.map((order) => (
                  <div key={order.id} className="rounded-2xl border border-gray-200 p-4 dark:border-gray-800">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-white">{order.id}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{new Date(order.orderedAt).toLocaleDateString()}</p>
                      </div>
                      <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-blue-700 dark:bg-blue-950/40 dark:text-blue-200">
                        {order.status}
                      </span>
                    </div>
                    <div className="mt-3 space-y-1 text-sm text-gray-600 dark:text-gray-400">
                      {order.items.slice(0, 2).map((item) => (
                        <p key={`${order.id}-${item.id}`}>
                          {item.title} × {item.quantity}
                        </p>
                      ))}
                    </div>
                    <p className="mt-3 text-sm font-semibold text-gray-900 dark:text-white">${order.total.toFixed(2)}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
