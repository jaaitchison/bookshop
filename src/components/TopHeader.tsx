"use client";

import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAccount } from "../context/AccountContext";
import { useCart } from "../context/CartContext";

const navItems = [
  { href: "/books", label: "Books" },
  { href: "/library", label: "Library" },
  { href: "/account", label: "Account" },
] as const;

const isActiveRoute = (pathname: string, href: string) =>
  pathname === href || pathname.startsWith(`${href}/`);

const getAreaLabel = (pathname: string) => {
  if (pathname.startsWith("/admin")) return "Administration";
  if (pathname.startsWith("/studio") || pathname.startsWith("/writer")) return "Writers Back Office";
  return "Front of House";
};

const HeartbeatIcon = () => (
  <svg
    viewBox="0 0 64 28"
    className="h-7 w-16 text-emerald-500"
    fill="none"
    stroke="currentColor"
    strokeWidth="3"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M2 15h12l5-9 7 18 7-14 5 5h24" />
  </svg>
);

const MobileNav: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname() || "/";
  const { hasRole, isAuthenticated, profile, signOut } = useAccount();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-40 lg:hidden">
      <div className="fixed inset-0 bg-black/20 backdrop-blur-sm" onClick={onClose} />
      <nav
        ref={menuRef}
        className="fixed bottom-0 right-0 top-28 w-72 overflow-y-auto border-l border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900"
      >
        <div className="space-y-3 p-4">
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

          {hasRole("writer") ? (
            <Link
              href="/studio"
              className="bookshop-nav-link flex w-full justify-between px-4 py-3"
              data-active={pathname.startsWith("/studio")}
              onClick={onClose}
            >
              Writer Studio
            </Link>
          ) : null}

          {hasRole("admin") ? (
            <Link
              href="/admin"
              className="bookshop-nav-link flex w-full justify-between px-4 py-3"
              data-active={pathname.startsWith("/admin")}
              onClick={onClose}
            >
              Admin
            </Link>
          ) : null}

          {!isAuthenticated ? (
            <Link href="/auth" className="bookshop-nav-link flex w-full justify-between px-4 py-3" onClick={onClose}>
              Sign in
            </Link>
          ) : (
            <>
              <div className="rounded-2xl border border-slate-200 p-4 text-sm text-slate-600 dark:border-slate-700 dark:text-slate-300">
                Signed in as <strong>{profile.username}</strong>
              </div>
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
            </>
          )}
        </div>
      </nav>
    </div>
  );
};

export const TopHeader: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname() || "/";
  const { count, openCart } = useCart();
  const { hasRole } = useAccount();
  const areaLabel = getAreaLabel(pathname);

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="mx-auto flex w-4/5 items-center py-4">
          <Link href="/" className="flex shrink-0 items-center">
            <Image
              src="/logo.jpg"
              alt="Book Shop logo"
              width={120}
              height={120}
              priority
              className="h-24 w-24 rounded-2xl object-contain sm:h-28 sm:w-28"
            />
          </Link>

          <Link
            href="/"
            className="ml-12 shrink-0 text-4xl font-black tracking-tight text-slate-900 dark:text-white sm:text-5xl"
          >
            Book Shop
          </Link>

          <nav className="ml-auto hidden items-center gap-2 lg:flex" aria-label="Main navigation">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="bookshop-nav-link"
                data-active={isActiveRoute(pathname, item.href)}
              >
                {item.label}
              </Link>
            ))}

            {hasRole("writer") ? (
              <Link href="/studio" className="bookshop-nav-link" data-active={pathname.startsWith("/studio")}>
                Studio
              </Link>
            ) : null}

            {hasRole("admin") ? (
              <Link href="/admin" className="bookshop-nav-link" data-active={pathname.startsWith("/admin")}>
                Admin
              </Link>
            ) : null}

            <button onClick={openCart} className="bookshop-button-primary px-4 py-2 text-sm">
              Cart
              {count > 0 ? (
                <span className="ml-2 rounded-full bg-violet-700 px-2 py-0.5 text-xs text-white">
                  {count}
                </span>
              ) : null}
            </button>

            <div className="ml-4 flex items-center gap-3 border-l border-slate-300 pl-5 dark:border-slate-600">
              <HeartbeatIcon />
              <span className="whitespace-nowrap text-sm font-bold text-slate-900 dark:text-white">
                {areaLabel}
              </span>
            </div>
          </nav>

          <button
            onClick={() => setMobileMenuOpen((open) => !open)}
            aria-label="Toggle navigation"
            aria-expanded={mobileMenuOpen}
            className="ml-auto rounded-full border border-slate-300 p-3 lg:hidden dark:border-slate-600"
          >
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </header>

      <MobileNav isOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />
    </>
  );
};

export default TopHeader;
