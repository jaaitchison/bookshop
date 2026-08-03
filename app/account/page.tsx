'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';
import { useAccount } from '@/src/context/AccountContext';
import { accountActivity, accountLibrary, getPersonalizedNotifications } from '@/src/data/account';
import { mockBooks } from '@/src/data/books';
import type { SocialProvider } from '@/src/types/account';

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
    setActiveRole,
    hasRole,
    isAuthenticated,
    orders,
  } = useAccount();
  const [wishlistCount, setWishlistCount] = useState(0);

  const toggleGoal = (goal: 'reading' | 'writing' | 'both') => {
    const nextGoals = profile.goals.includes(goal)
      ? profile.goals.filter((item) => item !== goal)
      : [...profile.goals, goal];

    setGoals(nextGoals);
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

  const resolvedOrders = orders;

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
  const verificationBadgeClass = hasRole('writer')
    ? 'bookshop-badge bookshop-badge-warning'
    : hasRole('admin')
      ? 'bookshop-badge bookshop-badge-danger'
      : 'bookshop-badge bookshop-badge-accent';
  const onboardingBadgeClass = profile.onboardingComplete
    ? 'bookshop-badge bookshop-badge-success'
    : 'bookshop-badge bookshop-badge-warning';
  const securityBadgeClass = profile.mfaEnabled
    ? 'bookshop-badge bookshop-badge-success'
    : 'bookshop-badge bookshop-badge-warning';

  if (!isAuthenticated) {
    return (
      <main className="min-h-screen bg-[var(--bookshop-bg)] py-8">
        <div className="mx-auto w-11/12 rounded-3xl border border-slate-200 border-l-8 border-l-emerald-600 bg-white px-10 py-8 text-center shadow-sm sm:w-10/12 lg:w-4/5 dark:border-slate-700 dark:border-l-emerald-500 dark:bg-slate-900">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[var(--bookshop-accent)]">Secure access</p>
          <h2 className="mt-4 text-3xl font-semibold text-[var(--bookshop-text)]">Sign in to unlock your account hub</h2>
          <p className="mt-4 text-[var(--bookshop-muted)]">
            Your unified dashboard, library, and creator tools are available after authentication so your activity stays connected to one profile.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/auth" className="bookshop-button-primary px-5 py-2.5 text-sm">
              Sign in or create an account
            </Link>
            <Link href="/books" className="bookshop-button-quiet px-5 py-2.5 text-sm">
              Continue browsing books
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--bookshop-bg)] py-8">
      <div className="mx-auto flex w-11/12 flex-col gap-8 sm:w-10/12 lg:w-4/5">
        <section className="rounded-3xl border border-slate-200 border-l-8 border-l-emerald-600 bg-white px-10 py-8 shadow-sm dark:border-slate-700 dark:border-l-emerald-500 dark:bg-slate-900">
          <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--bookshop-accent)] text-xl font-semibold text-[var(--bookshop-accent-soft)]">
                {profile.avatar}
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-3">
                  <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[var(--bookshop-accent)]">
                    Unified account
                  </p>
                  <span className="bookshop-badge bookshop-badge-accent">Current view {profile.activeRole}</span>
                </div>
                <h2 className="text-3xl font-bold text-[var(--bookshop-text)]">{profile.name}</h2>
                <p className="mt-1 text-sm text-[var(--bookshop-muted)]">@{profile.username} | {profile.location} | Joined {profile.joined}</p>
              </div>
            </div>
            <div className="bookshop-subcard min-w-[12rem] px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--bookshop-muted)]">Profile status</p>
              <p className="mt-2 text-base font-semibold text-[var(--bookshop-text)] capitalize">{profile.activeRole}</p>
              <p className="mt-1 text-sm text-[var(--bookshop-muted)]">Your dashboard follows this role across reading, publishing, and admin tools.</p>
            </div>
          </div>
          <div className="bookshop-subcard mt-6 p-4">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[var(--bookshop-muted)]">
              Account readiness
            </p>
            <ul className="mt-3 space-y-2 text-sm text-[var(--bookshop-muted)]">
              {readinessHighlights.map((item) => (
                <li key={item} className="flex gap-2">
                  <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-[var(--bookshop-accent)]" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.3fr_0.9fr]">
          <div className="space-y-6">
            <div className="rounded-3xl border border-slate-200 border-l-8 border-l-emerald-600 bg-white px-10 py-7 shadow-sm dark:border-slate-700 dark:border-l-emerald-500 dark:bg-slate-900">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[var(--bookshop-muted)]">
                    Verification status
                  </p>
                  <h2 className="text-xl font-semibold text-[var(--bookshop-text)]">
                    {hasRole('writer') ? 'Verified creator profile' : hasRole('admin') ? 'Trusted admin profile' : 'Reader profile'}
                  </h2>
                  <p className="mt-2 text-sm text-[var(--bookshop-muted)]">
                    {hasRole('writer')
                      ? 'Your creator identity is marked as verified and ready for publishing features.'
                      : hasRole('admin')
                        ? 'Your admin identity is tagged with elevated moderation access.'
                        : 'You are currently operating in reader mode with access to browsing and purchases.'}
                  </p>
                </div>
                <span className={verificationBadgeClass}>
                  {hasRole('writer') ? 'Verified writer' : hasRole('admin') ? 'Admin access' : 'Reader ready'}
                </span>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="bookshop-pill px-3 py-1 text-sm text-[var(--bookshop-text)]">
                  Unified account
                </span>
                {hasRole('writer') ? (
                  <span className="bookshop-badge bookshop-badge-warning normal-case tracking-normal">
                    Studio tools enabled
                  </span>
                ) : null}
                {hasRole('admin') ? (
                  <span className="bookshop-badge bookshop-badge-danger normal-case tracking-normal">
                    Moderation access
                  </span>
                ) : null}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 border-l-8 border-l-emerald-600 bg-white px-10 py-7 shadow-sm dark:border-slate-700 dark:border-l-emerald-500 dark:bg-slate-900">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[var(--bookshop-muted)]">
                    Onboarding
                  </p>
                  <h2 className="text-xl font-semibold text-[var(--bookshop-text)]">
                    How will you use Bookshop?
                  </h2>
                </div>
                <span className={onboardingBadgeClass}>
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
                      className={`rounded-xl border p-4 text-left transition ${
                        selected
                          ? 'border-[var(--bookshop-accent)] bg-[var(--bookshop-accent-soft)]'
                          : 'border-[var(--bookshop-border)] bg-[var(--bookshop-surface)] hover:border-[var(--bookshop-accent)]'
                      }`}
                    >
                      <p className="font-semibold text-[var(--bookshop-text)]">{option.label}</p>
                      <p className="mt-2 text-sm text-[var(--bookshop-muted)]">{option.description}</p>
                    </button>
                  );
                })}
              </div>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
                <button
                  type="button"
                  onClick={completeOnboarding}
                  className="bookshop-button-primary px-5 py-2.5 text-sm"
                >
                  Save onboarding profile
                </button>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 border-l-8 border-l-emerald-600 bg-white px-10 py-7 shadow-sm dark:border-slate-700 dark:border-l-emerald-500 dark:bg-slate-900">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[var(--bookshop-muted)]">
                    Security & sign-in
                  </p>
                  <h2 className="text-xl font-semibold text-[var(--bookshop-text)]">Social login and MFA readiness</h2>
                </div>
                <span className={securityBadgeClass}>
                  {profile.mfaEnabled ? 'MFA enabled' : 'MFA pending'}
                </span>
              </div>
              <div className="mt-6 space-y-4">
                <div className="bookshop-subcard p-4">
                  <p className="text-sm font-semibold text-[var(--bookshop-text)]">Connected social providers</p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    {socialProviders.map((provider) => {
                      const connected = profile.connectedSocials.includes(provider);
                      return (
                        <button
                          key={provider}
                          type="button"
                          className={`rounded-xl border px-3 py-3 text-left text-sm font-medium transition ${connected ? 'border-[var(--bookshop-accent)] bg-[var(--bookshop-accent-soft)] text-[var(--bookshop-accent)]' : 'border-[var(--bookshop-border)] bg-[var(--bookshop-surface)] text-[var(--bookshop-text)] hover:border-[var(--bookshop-accent)]'}`}
                        >
                          <p>{provider}</p>
                          <p className="mt-1 text-xs uppercase tracking-[0.2em] text-[var(--bookshop-muted)]">{connected ? 'Connected by verified OAuth' : 'Available soon'}</p>
                        </button>
                      );
                    })}
                  </div>
                  <p className="mt-3 text-sm text-[var(--bookshop-muted)]">
                    Bookshop is preparing a full OAuth rollout for Google, Microsoft, and Apple sign-ins with a seamless handoff back to your account profile.
                  </p>
                </div>
                <div className="bookshop-subcard p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-[var(--bookshop-text)]">Multi-factor authentication</p>
                      <p className="mt-1 text-sm text-[var(--bookshop-muted)]">Current method: {profile.mfaMethod}</p>
                    </div>                    <span className="bookshop-badge bookshop-badge-neutral">
                      Configuration coming later
                    </span>
                  </div>
                  <p className="mt-3 text-sm text-[var(--bookshop-muted)]">
                    MFA status is read from the server. Enabling or disabling MFA will only be available once the real verification and recovery flow is implemented.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 border-l-8 border-l-emerald-600 bg-white px-10 py-7 shadow-sm dark:border-slate-700 dark:border-l-emerald-500 dark:bg-slate-900">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[var(--bookshop-muted)]">
                    Role-based experience
                  </p>
                  <h2 className="text-xl font-semibold text-[var(--bookshop-text)]">Switch context instantly</h2>
                </div>
                <span className="bookshop-badge bookshop-badge-neutral">One profile</span>
              </div>
              <div className="mt-6 grid gap-4 md:grid-cols-3">
                <div className="bookshop-subcard p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-[var(--bookshop-text)]">Reader</p>
                    <span className="bookshop-badge bookshop-badge-accent normal-case tracking-normal">Browse</span>
                  </div>
                  <p className="mt-2 text-sm text-[var(--bookshop-muted)]">Browse, buy, and revisit your library.</p>
                  <button
                    type="button"
                    onClick={() => setActiveRole('reader')}
                    className="bookshop-button-secondary mt-4 px-4 py-2 text-sm"
                  >
                    Open reader view
                  </button>
                </div>
                <div className="bookshop-subcard p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-[var(--bookshop-text)]">Writer</p>
                    <span className="bookshop-badge bookshop-badge-warning normal-case tracking-normal">Create</span>
                  </div>
                  <p className="mt-2 text-sm text-[var(--bookshop-muted)]">Publish books and manage sales from one place.</p>
                  {hasRole('writer') ? (
                    <button
                      type="button"
                      onClick={() => setActiveRole('writer')}
                      className="bookshop-button-primary mt-4 px-4 py-2 text-sm"
                    >
                      Open creator view
                    </button>
                  ) : (
                    <p className="mt-4 text-sm text-[var(--bookshop-muted)]">
                      Writer access must be assigned by an administrator.
                    </p>
                  )}
                </div>
                <div className="bookshop-subcard p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-[var(--bookshop-text)]">Admin</p>
                    <span className="bookshop-badge bookshop-badge-danger normal-case tracking-normal">Manage</span>
                  </div>
                  <p className="mt-2 text-sm text-[var(--bookshop-muted)]">Moderate reviews and guide platform operations.</p>
                  {hasRole('admin') ? (
                    <button
                      type="button"
                      onClick={() => setActiveRole('admin')}
                      className="bookshop-button-primary mt-4 px-4 py-2 text-sm"
                    >
                      Open admin view
                    </button>
                  ) : (
                    <p className="mt-4 text-sm text-[var(--bookshop-muted)]">
                      Administrator access must be assigned by an administrator.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-3xl border border-slate-200 border-l-8 border-l-emerald-600 bg-white px-10 py-7 shadow-sm dark:border-slate-700 dark:border-l-emerald-500 dark:bg-slate-900">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-[var(--bookshop-text)]">Notifications</h2>
                <span className="rounded-full bg-[var(--bookshop-surface-muted)] px-3 py-1 text-sm text-[var(--bookshop-muted)]">
                  {notifications.filter((notification) => notification.unread).length} unread
                </span>
              </div>
              <div className="mt-6 space-y-3">
                {notifications.map((notification) => (
                  <div key={notification.id} className="bookshop-subcard p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-[var(--bookshop-text)]">{notification.title}</p>
                        <p className="mt-1 text-sm text-[var(--bookshop-muted)]">{notification.detail}</p>
                      </div>
                      {notification.unread ? (
                        <span className="bookshop-badge bookshop-badge-accent">
                          New
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-3 text-xs uppercase tracking-[0.2em] text-[var(--bookshop-muted)]">
                      {notification.category} Â· {notification.timestamp}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 border-l-8 border-l-emerald-600 bg-white px-10 py-7 shadow-sm dark:border-slate-700 dark:border-l-emerald-500 dark:bg-slate-900">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-[var(--bookshop-text)]">Quick links</h2>
                <span className="rounded-full bg-[var(--bookshop-surface-muted)] px-3 py-1 text-sm text-[var(--bookshop-muted)]">
                  Unified dashboard
                </span>
              </div>
              <div className="mt-6 space-y-3">
                <Link href="/library" className="bookshop-subcard flex items-center justify-between p-4 transition hover:border-[var(--bookshop-accent)] hover:bg-[var(--bookshop-accent-soft)]">
                  <span className="font-medium text-[var(--bookshop-text)]">My library</span>
                  <span className="text-sm text-[var(--bookshop-muted)]">{libraryItems.length} saved items</span>
                </Link>
                <Link href="/books" className="bookshop-subcard flex items-center justify-between p-4 transition hover:border-[var(--bookshop-accent)] hover:bg-[var(--bookshop-accent-soft)]">
                  <span className="font-medium text-[var(--bookshop-text)]">Explore books</span>
                  <span className="text-sm text-[var(--bookshop-muted)]">Search & filter</span>
                </Link>
                <Link href="/books" className="bookshop-subcard flex items-center justify-between p-4 transition hover:border-[var(--bookshop-accent)] hover:bg-[var(--bookshop-accent-soft)]">
                  <span className="font-medium text-[var(--bookshop-text)]">Saved wishlist</span>
                  <span className="text-sm text-[var(--bookshop-muted)]">{wishlistCount} book{wishlistCount === 1 ? '' : 's'}</span>
                </Link>
                {hasRole('writer') ? (
                  <Link href="/studio" className="bookshop-subcard flex items-center justify-between p-4 transition hover:border-[var(--bookshop-accent)] hover:bg-[var(--bookshop-accent-soft)]">
                    <span className="font-medium text-[var(--bookshop-text)]">Creator Studio</span>
                    <span className="text-sm text-[var(--bookshop-muted)]">Manage releases</span>
                  </Link>
                ) : null}
                {hasRole('admin') ? (
                  <Link href="/admin" className="bookshop-subcard flex items-center justify-between p-4 transition hover:border-[var(--bookshop-accent)] hover:bg-[var(--bookshop-accent-soft)]">
                    <span className="font-medium text-[var(--bookshop-text)]">Admin console</span>
                    <span className="text-sm text-[var(--bookshop-muted)]">Moderation tools</span>
                  </Link>
                ) : null}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 border-l-8 border-l-emerald-600 bg-white px-10 py-7 shadow-sm dark:border-slate-700 dark:border-l-emerald-500 dark:bg-slate-900">
              <h2 className="text-xl font-semibold text-[var(--bookshop-text)]">Recent activity</h2>
              <div className="mt-4 space-y-3">
                {accountActivity.map((item) => (
                  <div key={item.title} className="bookshop-subcard p-4">
                    <p className="text-sm font-semibold text-[var(--bookshop-text)]">{item.title}</p>
                    <p className="mt-1 text-sm text-[var(--bookshop-muted)]">{item.detail}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-8 lg:grid-cols-2">
          <div className="rounded-3xl border border-slate-200 border-l-8 border-l-emerald-600 bg-white px-10 py-7 shadow-sm dark:border-slate-700 dark:border-l-emerald-500 dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-[var(--bookshop-text)]">Your library</h2>
              <span className="text-sm text-[var(--bookshop-muted)]">Reader view</span>
            </div>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {libraryItems.map((book) => (
                <div key={book.id} className="bookshop-subcard p-4">
                  <div className="relative mb-3 h-32 overflow-hidden rounded-xl">
                    <Image src={book.cover} alt={book.title} fill className="object-cover" />
                  </div>
                  <p className="font-semibold text-[var(--bookshop-text)]">{book.title}</p>
                  <p className="text-sm text-[var(--bookshop-muted)]">{book.author}</p>
                  <p className="mt-2 text-sm text-[var(--bookshop-accent)]">{book.status}</p>
                  {book.progress ? <p className="text-sm text-[var(--bookshop-muted)]">{book.progress}</p> : null}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 border-l-8 border-l-emerald-600 bg-white px-10 py-7 shadow-sm dark:border-slate-700 dark:border-l-emerald-500 dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-[var(--bookshop-text)]">Order history</h2>
              <span className="text-sm text-[var(--bookshop-muted)]">Signed-in purchases</span>
            </div>
            <div className="mt-6 space-y-4">
              {resolvedOrders.length === 0 ? (
                <div className="rounded-[1.25rem] border border-dashed border-[var(--bookshop-border)] p-4 text-sm text-[var(--bookshop-muted)]">
                  No orders yet. Complete a purchase from the checkout page to see it here.
                </div>
              ) : (
                resolvedOrders.map((order) => (
                  <div key={order.id} className="bookshop-subcard p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-[var(--bookshop-text)]">{order.id}</p>
                        <p className="text-sm text-[var(--bookshop-muted)]">{new Date(order.orderedAt).toLocaleDateString()}</p>
                      </div>
                      <span className="bookshop-badge bookshop-badge-accent">
                        {order.status}
                      </span>
                    </div>
                    <div className="mt-3 space-y-1 text-sm text-[var(--bookshop-muted)]">
                      {order.items.slice(0, 2).map((item) => (
                        <p key={`${order.id}-${item.id}`}>
                          {item.title} ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â {item.quantity}
                        </p>
                      ))}
                    </div>
                    <p className="mt-3 text-sm font-semibold text-[var(--bookshop-text)]">${order.total.toFixed(2)}</p>
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

