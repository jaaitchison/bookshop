"use client";

import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAccount } from "../context/AccountContext";
import { useCart } from "../context/CartContext";

type SiteArea = "front" | "writer" | "admin";

const navItems = [
  { href: "/books", label: "Books" },
  { href: "/library", label: "Library" },
  { href: "/account", label: "Account" },
] as const;

const isActiveRoute = (pathname: string, href: string) =>
  pathname === href || pathname.startsWith(`${href}/`);

const getArea = (pathname: string): { label: string; area: SiteArea } => {
  if (pathname.startsWith("/admin")) {
    return { label: "Administration", area: "admin" };
  }

  if (pathname.startsWith("/studio") || pathname.startsWith("/writer")) {
    return { label: "Writers Back Office", area: "writer" };
  }

  return { label: "Front of House", area: "front" };
};

const getAreaColour = (area: SiteArea) => {
  if (area === "admin") return "text-red-500";
  if (area === "writer") return "text-amber-500";
  return "text-emerald-500";
};

const HeartbeatIcon = ({ area }: { area: SiteArea }) => (
  <svg
    viewBox="0 0 76 30"
    className={`h-7 w-20 ${getAreaColour(area)}`}
    fill="none"
    stroke="currentColor"
    strokeWidth="3"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M2 16h13l5-10 7 19 8-16 6 7h33" opacity="0.22" />
    <path d="M2 16h13l5-10 7 19 8-16 6 7h33" strokeDasharray="22 64">
      <animate
        attributeName="stroke-dashoffset"
        from="86"
        to="0"
        dur="1.35s"
        repeatCount="indefinite"
      />
    </path>
  </svg>
);

const MobileNav: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  area: { label: string; area: SiteArea };
}> = ({ isOpen, onClose, area }) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname() || "/";
  const { hasRole, isAuthenticated, profile, signOut } = useAccount();
  const { count, openCart } = useCart();

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
        className="fixed bottom-0 right-0 top-28 w-80 max-w-[88vw] overflow-y-auto border-l border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900"
        aria-label="Mobile navigation"
      >
        <div className="space-y-3 p-5">
          <div className="mb-4 flex items-center gap-3 border-b border-slate-200 pb-4 dark:border-slate-700">
            <HeartbeatIcon area={area.area} />
            <span className={`text-sm font-bold ${getAreaColour(area.area)}`}>{area.label}</span>
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
              Administration
            </Link>
          ) : null}

          <button
            type="button"
            onClick={() => {
              openCart();
              onClose();
            }}
            className="bookshop-button-primary w-full px-4 py-3 text-sm"
          >
            Cart{count > 0 ? ` (${count})` : ""}
          </button>

          {!isAuthenticated ? (
            <Link
              href="/auth"
              className="bookshop-button-quiet flex w-full justify-center px-4 py-3 text-sm"
              onClick={onClose}
            >
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
                  void signOut();
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
  const currentArea = getArea(pathname);

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="mx-auto flex w-11/12 items-center py-3 sm:w-10/12 lg:w-4/5">
          <Link href="/" className="flex shrink-0 items-center" aria-label="Book Shop home">
            <Image
              src="/logo.jpg"
              alt="Book Shop logo"
              width={120}
              height={120}
              priority
              className="h-20 w-20 rounded-2xl object-contain sm:h-24 sm:w-24 lg:h-28 lg:w-28"
            />
          </Link>

          <Link
            href="/"
            className="ml-5 shrink-0 text-3xl font-black tracking-tight text-slate-900 sm:ml-8 sm:text-4xl lg:ml-10 lg:text-5xl dark:text-white"
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
              <Link
                href="/studio"
                className="bookshop-nav-link"
                data-active={pathname.startsWith("/studio")}
              >
                Studio
              </Link>
            ) : null}

            {hasRole("admin") ? (
              <Link
                href="/admin"
                className="bookshop-nav-link"
                data-active={pathname.startsWith("/admin")}
              >
                Admin
              </Link>
            ) : null}

            <button type="button" onClick={openCart} className="bookshop-button-primary px-4 py-2 text-sm">
              Cart
              {count > 0 ? (
                <span className="ml-2 rounded-full bg-slate-900 px-2 py-0.5 text-xs text-white dark:bg-white dark:text-slate-900">
                  {count}
                </span>
              ) : null}
            </button>

            <div className="ml-3 flex items-center gap-2 border-l border-slate-300 pl-4 dark:border-slate-600">
              <HeartbeatIcon area={currentArea.area} />
              <span className={`whitespace-nowrap text-sm font-bold ${getAreaColour(currentArea.area)}`}>
                {currentArea.label}
              </span>
            </div>
          </nav>

          <div className="ml-auto flex items-center gap-3 lg:hidden">
            <HeartbeatIcon area={currentArea.area} />
            <button
              type="button"
              onClick={() => setMobileMenuOpen((open) => !open)}
              aria-label="Toggle navigation"
              aria-expanded={mobileMenuOpen}
              className="rounded-full border border-slate-300 p-3 dark:border-slate-600"
            >
              <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      <MobileNav
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        area={currentArea}
      />
    </>
  );
};

export default TopHeader;