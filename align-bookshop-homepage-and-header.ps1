$ErrorActionPreference = "Stop"

$repo = (Get-Location).Path
if (-not (Test-Path (Join-Path $repo "package.json"))) {
    throw "Run this script from C:\coding\bookshop."
}

$topHeader = @'
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
'@

Set-Content -Path (Join-Path $repo "src\components\TopHeader.tsx") -Value $topHeader -Encoding utf8

$pageHeader = @'
"use client";

import { usePathname } from "next/navigation";

export type SiteArea = "front" | "writer" | "admin";

interface PageHeaderConfig {
  area: SiteArea;
  areaLabel: string;
  title: string;
  description: string;
}

function getPageConfig(pathname: string): PageHeaderConfig {
  if (pathname.startsWith("/admin")) {
    return {
      area: "admin",
      areaLabel: "Administration",
      title: "Administration Dashboard",
      description: "Manage the catalogue, users, orders and operation of the Bookshop platform.",
    };
  }

  if (pathname.startsWith("/studio") || pathname.startsWith("/writer")) {
    return {
      area: "writer",
      areaLabel: "Writers Back Office",
      title: "Writer Studio",
      description: "Manage books, publishing activity, sales information and reader engagement.",
    };
  }

  if (pathname === "/") {
    return {
      area: "front",
      areaLabel: "Front of House",
      title: "Bookshop",
      description: "Discover books, writers and stories from across the Bookshop catalogue.",
    };
  }

  if (pathname === "/books") {
    return {
      area: "front",
      areaLabel: "Front of House",
      title: "Books Catalogue",
      description: "Browse, search and filter the books currently available through Bookshop.",
    };
  }

  if (pathname.startsWith("/books/")) {
    return {
      area: "front",
      areaLabel: "Front of House",
      title: "Book Details",
      description: "Read about this title, review its details and choose how you would like to continue.",
    };
  }

  if (pathname === "/library") {
    return {
      area: "front",
      areaLabel: "Front of House",
      title: "My Library",
      description: "Your purchased and saved books in one place.",
    };
  }

  if (pathname === "/account") {
    return {
      area: "front",
      areaLabel: "Front of House",
      title: "Account Hub",
      description: "Manage your profile, reading activity and access to writer or administration tools.",
    };
  }

  if (pathname === "/auth") {
    return {
      area: "front",
      areaLabel: "Front of House",
      title: "Sign In",
      description: "Sign in to your Bookshop account or create a new account.",
    };
  }

  if (pathname.startsWith("/checkout/success")) {
    return {
      area: "front",
      areaLabel: "Front of House",
      title: "Order Confirmation",
      description: "Your purchase has been completed and your order details are shown below.",
    };
  }

  if (pathname.startsWith("/checkout")) {
    return {
      area: "front",
      areaLabel: "Front of House",
      title: "Checkout",
      description: "Review your order and complete your purchase securely.",
    };
  }

  return {
    area: "front",
    areaLabel: "Front of House",
    title: "Bookshop",
    description: "Independent publishing and reading in one connected platform.",
  };
}

export default function PageHeader() {
  const pathname = usePathname() || "/";
  const config = getPageConfig(pathname);

  return (
    <section className="mx-auto w-11/12 pt-10 sm:w-10/12 sm:pt-12 lg:w-4/5">
      <div className="rounded-3xl border border-slate-200 border-l-8 border-l-blue-600 bg-white px-10 py-7 shadow-sm dark:border-slate-700 dark:border-l-blue-500 dark:bg-slate-900">
        <p className="text-xs font-extrabold uppercase tracking-widest text-blue-700 dark:text-blue-300">
          {config.areaLabel}
        </p>
        <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-900 dark:text-white sm:text-4xl">
          {config.title}
        </h1>
        <p className="mt-4 max-w-3xl text-base text-slate-600 dark:text-slate-300">
          {config.description}
        </p>
      </div>
    </section>
  );
}
'@

Set-Content -Path (Join-Path $repo "src\components\layout\PageHeader.tsx") -Value $pageHeader -Encoding utf8

$displaySection = @'
import type { ReactNode } from "react";

interface DisplaySectionProps {
  title?: string;
  description?: string;
  children: ReactNode;
  className?: string;
}

export default function DisplaySection({
  title,
  description,
  children,
  className = "",
}: DisplaySectionProps) {
  return (
    <section
      className={`mb-8 rounded-3xl border border-slate-200 border-l-8 border-l-blue-600 bg-white shadow-sm last:mb-0 dark:border-slate-700 dark:border-l-blue-500 dark:bg-slate-900 ${className}`.trim()}
    >
      {title || description ? (
        <header className="border-b border-slate-200 px-10 py-6 dark:border-slate-700">
          {title ? (
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              {title}
            </h2>
          ) : null}
          {description ? (
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              {description}
            </p>
          ) : null}
        </header>
      ) : null}
      <div className="px-10 py-7">{children}</div>
    </section>
  );
}
'@

Set-Content -Path (Join-Path $repo "src\components\layout\DisplaySection.tsx") -Value $displaySection -Encoding utf8

$hero = @'
import React from 'react';
import Link from 'next/link';

export const Hero: React.FC = () => {
  return (
    <section className="py-8">
      <div className="mx-auto w-11/12 sm:w-10/12 lg:w-4/5">
        <div className="rounded-3xl border border-slate-200 border-l-8 border-l-blue-600 bg-white px-10 py-8 shadow-sm dark:border-slate-700 dark:border-l-blue-500 dark:bg-slate-900">
          <p className="text-xs font-bold uppercase tracking-widest text-blue-700 dark:text-blue-300">
            Independent publishing
          </p>

          <h2 className="mt-4 max-w-4xl text-3xl font-black tracking-tight text-slate-900 dark:text-white sm:text-4xl">
            Discover books, stories, and a place for authors to publish with clarity.
          </h2>

          <p className="mt-4 max-w-4xl text-base leading-7 text-slate-600 dark:text-slate-300">
            Bookshop brings readers and writers together in one calm, modern space — from discovery and previewing to checkout and a personal library.
          </p>

          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/books" className="bookshop-button-primary px-5 py-3 text-sm">
              Browse the collection
            </Link>
            <Link href="/studio" className="bookshop-button-quiet px-5 py-3 text-sm">
              Open the writer studio
            </Link>
          </div>

          <div className="mt-7 flex flex-wrap gap-x-10 gap-y-4 border-t border-slate-200 pt-6 text-sm text-slate-600 dark:border-slate-700 dark:text-slate-300">
            <div>
              <span className="block text-2xl font-bold text-slate-900 dark:text-white">50k+</span>
              <span>Books</span>
            </div>
            <div>
              <span className="block text-2xl font-bold text-slate-900 dark:text-white">100k+</span>
              <span>Readers</span>
            </div>
            <div>
              <span className="block text-2xl font-bold text-slate-900 dark:text-white">5k+</span>
              <span>Authors</span>
            </div>
          </div>

          <div className="mt-7 border-t border-slate-200 pt-6 dark:border-slate-700">
            <p className="text-xs font-bold uppercase tracking-widest text-blue-700 dark:text-blue-300">
              What readers can expect
            </p>
            <ul className="mt-4 space-y-3 text-sm text-slate-700 dark:text-slate-200">
              <li className="border-b border-slate-200 pb-3 dark:border-slate-700">
                Free previews, instant unlocks, and a focused reading view.
              </li>
              <li className="border-b border-slate-200 pb-3 dark:border-slate-700">
                A simple purchase journey that feels clear and trustworthy.
              </li>
              <li>
                A personal library that keeps your books neatly organised.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
};
'@

Set-Content -Path (Join-Path $repo "src\components\book\Hero.tsx") -Value $hero -Encoding utf8

$featured = @'
import Link from 'next/link';
import { BookCard } from './BookCard';
import { getFeaturedBooks } from '@/src/lib/catalog-data';

export const FeaturedBooks = async () => {
  const books = await getFeaturedBooks();

  return (
    <section className="pb-16 pt-0">
      <div className="mx-auto w-11/12 sm:w-10/12 lg:w-4/5">
        <div className="rounded-3xl border border-slate-200 border-l-8 border-l-blue-600 bg-white shadow-sm dark:border-slate-700 dark:border-l-blue-500 dark:bg-slate-900">
          <div className="flex items-center justify-between border-b border-slate-200 px-10 py-6 dark:border-slate-700">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                Featured Books
              </h2>
              <p className="mt-2 text-slate-600 dark:text-slate-300">
                Discover our handpicked collection of must-read books.
              </p>
            </div>
            <Link
              href="/books"
              className="text-sm font-semibold text-blue-700 transition hover:text-blue-800 dark:text-blue-300"
            >
              View All →
            </Link>
          </div>

          <div className="grid grid-cols-1 gap-6 px-10 py-8 sm:grid-cols-2 lg:grid-cols-3">
            {books.map((book) => (
              <BookCard key={book.id} book={book} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
'@

Set-Content -Path (Join-Path $repo "src\components\book\FeaturedBooks.tsx") -Value $featured -Encoding utf8

Write-Host ""
Write-Host "Homepage/header alignment patch applied." -ForegroundColor Green
Write-Host ""
Write-Host "Changed:"
Write-Host "  src/components/TopHeader.tsx"
Write-Host "  src/components/layout/PageHeader.tsx"
Write-Host "  src/components/layout/DisplaySection.tsx"
Write-Host "  src/components/book/Hero.tsx"
Write-Host "  src/components/book/FeaturedBooks.tsx"
Write-Host ""
Write-Host "No CSS files were modified."
Write-Host ""
Write-Host "Now run:"
Write-Host "  npm run lint"
Write-Host "  npm run build"