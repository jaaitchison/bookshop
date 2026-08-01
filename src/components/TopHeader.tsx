"use client";

import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from './ThemeProvider';
import type { ThemeMode } from './ThemeProvider';
import { useAccount } from '../context/AccountContext';
import { useCart } from '../context/CartContext';
import type { AccountRole } from '../types/account';

const navItems = [
  { href: '/books', label: 'Books' },
  { href: '/library', label: 'Library' },
  { href: '/account', label: 'Account' },
] as const;

const formatSegment = (segment: string) =>
  segment
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

const getPageTitle = (pathname: string) => {
  if (pathname === '/') return 'Home';
  if (pathname === '/books') return 'Books';
  if (pathname.startsWith('/books/')) return 'Book details';
  if (pathname === '/library') return 'Library';
  if (pathname === '/account') return 'Account';
  if (pathname === '/auth') return 'Sign in';
  if (pathname === '/checkout') return 'Checkout';
  if (pathname.startsWith('/checkout/success')) return 'Order confirmed';
  if (pathname === '/studio') return 'Writer Studio';
  if (pathname === '/admin') return 'Admin Dashboard';

  const segments = pathname.split('/').filter(Boolean);
  if (segments.length === 0) return 'Home';
  return formatSegment(segments[segments.length - 1]);
};

const getBreadcrumb = (pathname: string) => {
  if (pathname === '/') return 'Public Showcase';
  return pathname
    .split('/')
    .filter(Boolean)
    .map(formatSegment)
    .join(' • ');
};

const isActiveRoute = (pathname: string, href: string) =>
  pathname === href || pathname.startsWith(`${href}/`);

const Heartbeat: React.FC<{ zone: 'admin' | 'studio' | 'public' }> = ({ zone }) => {
  const color = zone === 'admin' ? 'bg-rose-600' : zone === 'studio' ? 'bg-amber-500' : 'bg-violet-600';
  const ariaLabel = zone === 'admin' ? 'Admin area' : zone === 'studio' ? 'Writer Studio' : 'Public Showcase';

  return (
    <div className="flex items-center rounded-full border border-[var(--bookshop-border)] bg-[var(--bookshop-surface)] px-3 py-1.5 text-sm font-semibold text-[var(--bookshop-text)] shadow-sm">
      <span className={`mr-2 h-2.5 w-2.5 rounded-full ${color} animate-pulse`} aria-hidden="true" />
      <span>{ariaLabel}</span>
      <span className="sr-only">{ariaLabel}</span>
    </div>
  );
};

const ThemeSwitcher: React.FC = () => {
  const { mode, setMode } = useTheme();

  return (
    <div className="flex items-center gap-2 rounded-full border border-[var(--bookshop-border)] bg-[var(--bookshop-surface)] px-3 py-1.5 text-sm font-semibold text-[var(--bookshop-text)] shadow-sm">
      <label className="text-sm text-[var(--bookshop-muted)]">Theme</label>
      <select
        value={mode}
        onChange={(e) => setMode(e.target.value as ThemeMode)}
        className="rounded-full border border-[var(--bookshop-border)] bg-[var(--bookshop-surface-muted)] px-2 py-1 text-sm text-[var(--bookshop-text)]"
        aria-label="Theme mode"
      >
        <option value="light">Light</option>
        <option value="dark">Dark</option>
        <option value="auto">Auto</option>
      </select>
    </div>
  );
};

const AuthActions: React.FC = () => {
  const { isAuthenticated, profile, signOut } = useAccount();

  if (!isAuthenticated) {
    return (
      <Link href="/auth" className="bookshop-button-quiet px-3 py-1.5 text-sm">
        Sign in
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Link href="/account" className="bookshop-button-quiet flex items-center gap-2 px-3 py-1.5 text-sm font-medium">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--bookshop-accent)] text-xs font-semibold text-[var(--bookshop-accent-soft)]">
          {profile.avatar}
        </span>
        <span className="hidden md:inline">{profile.username}</span>
      </Link>
      <button type="button" onClick={signOut} className="bookshop-button-quiet px-3 py-1.5 text-sm">
        Sign out
      </button>
    </div>
  );
};

const RoleSwitcher: React.FC = () => {
  const { profile, setActiveRole, hasRole } = useAccount();
  const roles: Array<{ id: AccountRole; label: string; enabled: boolean }> = [
    { id: 'reader', label: 'Reader', enabled: true },
    { id: 'writer', label: 'Writer', enabled: hasRole('writer') },
    { id: 'admin', label: 'Admin', enabled: hasRole('admin') },
  ];

  return (
    <div className="hidden xl:flex items-center gap-2 rounded-full border border-[var(--bookshop-border)] bg-[var(--bookshop-surface)] p-1 shadow-sm">
      {roles.filter((role) => role.enabled).map((role) => {
        const active = profile.activeRole === role.id;

        return (
          <button
            key={role.id}
            type="button"
            onClick={() => setActiveRole(role.id)}
            className={`rounded-full px-3 py-1 text-sm font-medium transition ${
              active
                ? 'border border-[var(--bookshop-border)] bg-[var(--bookshop-accent-soft)] text-[var(--bookshop-accent)] shadow-sm'
                : 'text-[var(--bookshop-accent)] hover:bg-[var(--bookshop-accent-soft)]'
            }`}
          >
            {role.label}
          </button>
        );
      })}
    </div>
  );
};

const MobileNav: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname() || '/';
  const { hasRole, isAuthenticated, profile, signOut } = useAccount();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-40 md:hidden">
      <div className="fixed inset-0 bg-black/20 backdrop-blur-sm" onClick={onClose} />
      <nav
        ref={menuRef}
        className="fixed bottom-0 left-0 top-[73px] w-72 overflow-y-auto border-r border-[var(--bookshop-border)] bg-[var(--bookshop-surface)] shadow-lg"
      >
        <div className="space-y-3 p-4">
          <div className="bookshop-subcard p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--bookshop-muted)]">Current page</p>
            <p className="mt-2 text-base font-semibold text-[var(--bookshop-text)]">{getPageTitle(pathname)}</p>
            <p className="mt-1 text-sm text-[var(--bookshop-muted)]">{getBreadcrumb(pathname)}</p>
          </div>
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="bookshop-nav-link flex w-full justify-between px-4 py-3"
              data-active={isActiveRoute(pathname, item.href)}
              onClick={onClose}
            >
              {item.label}
            </Link>
          ))}
          {isAuthenticated ? (
            <Link href="/account" className="bookshop-nav-link flex w-full items-center justify-between px-4 py-3" onClick={onClose}>
              <span>Signed in as {profile.username}</span>
              <span className="bookshop-badge bookshop-badge-accent">{profile.avatar}</span>
            </Link>
          ) : (
            <Link href="/auth" className="bookshop-nav-link flex w-full justify-between px-4 py-3" onClick={onClose}>
              Sign in
            </Link>
          )}
          {hasRole('writer') ? (
            <Link
              href="/studio"
              className="bookshop-nav-link flex w-full justify-between px-4 py-3"
              data-active={pathname.startsWith('/studio')}
              onClick={onClose}
            >
              Writer Studio
            </Link>
          ) : null}
          {hasRole('admin') ? (
            <Link
              href="/admin"
              className="bookshop-nav-link flex w-full justify-between px-4 py-3"
              data-active={pathname.startsWith('/admin')}
              onClick={onClose}
            >
              Admin
            </Link>
          ) : null}
          {isAuthenticated ? (
            <button
              type="button"
              onClick={() => {
                signOut();
                onClose();
              }}
              className="bookshop-button-quiet w-full px-4 py-3 text-sm"
            >
              Sign out
            </button>
          ) : null}
        </div>
      </nav>
    </div>
  );
};

export const TopHeader: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname() || '/';
  const { count, openCart } = useCart();
  const { hasRole } = useAccount();
  const zone: 'admin' | 'studio' | 'public' = pathname.startsWith('/admin')
    ? 'admin'
    : pathname.startsWith('/studio') || pathname.startsWith('/writer')
    ? 'studio'
    : 'public';

  const pageTitle = getPageTitle(pathname);
  const breadcrumb = getBreadcrumb(pathname);

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-[var(--bookshop-border)] bg-[var(--bookshop-surface)]/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="md:hidden">
              <button
                onClick={() => setMobileMenuOpen((open) => !open)}
                aria-label="Toggle navigation"
                aria-expanded={mobileMenuOpen}
                className="bookshop-button-quiet p-2"
              >
                <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
            <Link href="/" className="flex min-w-0 items-center gap-3">
              <Image src="/logo.jpg" alt="Bookshop logo" width={44} height={44} className="rounded-2xl object-cover" />
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-base font-semibold text-[var(--bookshop-text)]">Bookshop</span>
                  <span className="bookshop-badge bookshop-badge-accent hidden sm:inline-flex">{pageTitle}</span>
                </div>
                <p className="truncate text-xs text-[var(--bookshop-muted)]">{breadcrumb}</p>
              </div>
            </Link>
          </div>

          <nav className="hidden flex-1 items-center justify-center gap-2 lg:flex">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href} className="bookshop-nav-link" data-active={isActiveRoute(pathname, item.href)}>
                {item.label}
              </Link>
            ))}
            {hasRole('writer') ? (
              <Link href="/studio" className="bookshop-nav-link" data-active={pathname.startsWith('/studio')}>
                Studio
              </Link>
            ) : null}
            {hasRole('admin') ? (
              <Link href="/admin" className="bookshop-nav-link" data-active={pathname.startsWith('/admin')}>
                Admin
              </Link>
            ) : null}
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden md:block">
              <Heartbeat zone={zone} />
            </div>
            <RoleSwitcher />
            <div className="hidden sm:block">
              <ThemeSwitcher />
            </div>
            <button onClick={openCart} className="bookshop-button-primary inline-flex items-center px-3 py-1.5 text-sm">
              Cart
              {count > 0 ? (
                <span className="ml-2 rounded-full bg-[var(--bookshop-accent)] px-2 py-0.5 text-xs text-[var(--bookshop-accent-soft)]">
                  {count}
                </span>
              ) : null}
            </button>
            <div className="hidden md:block">
              <AuthActions />
            </div>
          </div>
        </div>
      </header>
      <MobileNav isOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />
    </>
  );
};

export default TopHeader;
